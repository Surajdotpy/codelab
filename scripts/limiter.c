/*
 * limiter.exe: runs a program inside a Windows Job Object with hard resource limits.
 *
 *   limiter.exe <program> [arguments...]
 *
 * CodeLab's runner starts every student program through this launcher so that:
 *   - total memory is capped (a runaway allocation fails instead of freezing the PC)
 *   - the number of processes is capped (stops fork bombs)
 *   - when the launcher exits or is killed, every process the program started is killed too
 *   - crash dialogs and a few desktop actions (clipboard, shutdown call) are blocked
 *
 * It does NOT block file or network access: it is a safety net, not a sandbox.
 * Built by scripts/fetch-runtimes.ps1 with the bundled GCC into runtimes/limiter.exe:
 *   gcc -O2 -s -municode -o limiter.exe limiter.c
 * (-municode selects the wide-character entry point wmain and defines UNICODE.)
 */
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <stdio.h>
#include <stdlib.h>
#include <wchar.h>

/* 256 MB is far more than beginner programs need, and small enough that one runaway program
   can't starve a 4 GB school PC. */
#ifndef MEM_LIMIT_MB
#define MEM_LIMIT_MB 256
#endif
#ifndef MAX_PROCESSES
#define MAX_PROCESSES 16
#endif

/* Writes one argument into out using the quoting rules CommandLineToArgvW expects. */
static wchar_t *append_quoted(wchar_t *out, const wchar_t *arg) {
    int needs_quotes = (*arg == L'\0') || wcspbrk(arg, L" \t\n\v\"") != NULL;
    if (!needs_quotes) {
        size_t n = wcslen(arg);
        wmemcpy(out, arg, n);
        return out + n;
    }
    *out++ = L'"';
    for (const wchar_t *p = arg;; p++) {
        size_t backslashes = 0;
        while (*p == L'\\') { backslashes++; p++; }
        if (*p == L'\0') {
            for (size_t i = 0; i < backslashes * 2; i++) *out++ = L'\\';
            break;
        } else if (*p == L'"') {
            for (size_t i = 0; i < backslashes * 2 + 1; i++) *out++ = L'\\';
            *out++ = L'"';
        } else {
            for (size_t i = 0; i < backslashes; i++) *out++ = L'\\';
            *out++ = *p;
        }
    }
    *out++ = L'"';
    return out;
}

static void make_inheritable(HANDLE h) {
    if (h != NULL && h != INVALID_HANDLE_VALUE) SetHandleInformation(h, HANDLE_FLAG_INHERIT, HANDLE_FLAG_INHERIT);
}

int wmain(int argc, wchar_t **argv) {
    if (argc < 2) {
        fputs("usage: limiter <program> [arguments...]\n", stderr);
        return 2;
    }

    /* The child inherits this, so a crash closes quietly instead of showing a dialog. */
    SetErrorMode(SEM_FAILCRITICALERRORS | SEM_NOGPFAULTERRORBOX | SEM_NOOPENFILEERRORBOX);

    /* Build the command line: every argument quoted so spaces in paths are safe. */
    size_t cap = 1;
    for (int i = 1; i < argc; i++) cap += wcslen(argv[i]) * 2 + 4;
    wchar_t *cmd = (wchar_t *)malloc(cap * sizeof(wchar_t));
    if (!cmd) return 3;
    wchar_t *end = cmd;
    for (int i = 1; i < argc; i++) {
        if (i > 1) *end++ = L' ';
        end = append_quoted(end, argv[i]);
    }
    *end = L'\0';

    HANDLE job = CreateJobObjectW(NULL, NULL);
    if (!job) { fprintf(stderr, "limiter: cannot create job (error %lu)\n", GetLastError()); return 3; }

    JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits;
    ZeroMemory(&limits, sizeof limits);
    limits.BasicLimitInformation.LimitFlags =
        JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE | JOB_OBJECT_LIMIT_ACTIVE_PROCESS |
        JOB_OBJECT_LIMIT_JOB_MEMORY | JOB_OBJECT_LIMIT_DIE_ON_UNHANDLED_EXCEPTION;
    limits.BasicLimitInformation.ActiveProcessLimit = MAX_PROCESSES;
    limits.JobMemoryLimit = (SIZE_T)MEM_LIMIT_MB * 1024 * 1024;
    if (!SetInformationJobObject(job, JobObjectExtendedLimitInformation, &limits, sizeof limits)) {
        fprintf(stderr, "limiter: cannot set limits (error %lu)\n", GetLastError());
        return 3;
    }

    JOBOBJECT_BASIC_UI_RESTRICTIONS ui;
    ui.UIRestrictionsClass = JOB_OBJECT_UILIMIT_EXITWINDOWS | JOB_OBJECT_UILIMIT_READCLIPBOARD |
                             JOB_OBJECT_UILIMIT_WRITECLIPBOARD | JOB_OBJECT_UILIMIT_SYSTEMPARAMETERS |
                             JOB_OBJECT_UILIMIT_DISPLAYSETTINGS | JOB_OBJECT_UILIMIT_GLOBALATOMS;
    SetInformationJobObject(job, JobObjectBasicUIRestrictions, &ui, sizeof ui); /* best effort */

    /* Pass our own stdin/stdout/stderr straight through to the program. */
    STARTUPINFOW si;
    ZeroMemory(&si, sizeof si);
    si.cb = sizeof si;
    si.dwFlags = STARTF_USESTDHANDLES;
    si.hStdInput = GetStdHandle(STD_INPUT_HANDLE);
    si.hStdOutput = GetStdHandle(STD_OUTPUT_HANDLE);
    si.hStdError = GetStdHandle(STD_ERROR_HANDLE);
    make_inheritable(si.hStdInput);
    make_inheritable(si.hStdOutput);
    make_inheritable(si.hStdError);

    /* Start suspended so the program can't create children before it is inside the job. */
    PROCESS_INFORMATION pi;
    ZeroMemory(&pi, sizeof pi);
    if (!CreateProcessW(NULL, cmd, NULL, NULL, TRUE, CREATE_SUSPENDED, NULL, NULL, &si, &pi)) {
        fprintf(stderr, "limiter: cannot start program (error %lu)\n", GetLastError());
        return 3;
    }
    if (!AssignProcessToJobObject(job, pi.hProcess)) {
        fprintf(stderr, "limiter: cannot place program in job (error %lu)\n", GetLastError());
        TerminateProcess(pi.hProcess, 1);
        return 3;
    }
    ResumeThread(pi.hThread);
    WaitForSingleObject(pi.hProcess, INFINITE);

    DWORD code = 0;
    GetExitCodeProcess(pi.hProcess, &code);

    /* If the program ran into the memory cap, say so in plain words. */
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION used;
    if (QueryInformationJobObject(job, JobObjectExtendedLimitInformation, &used, sizeof used, NULL) &&
        used.PeakJobMemoryUsed >= (SIZE_T)MEM_LIMIT_MB * 1024 * 1024 / 10 * 9) {
        fprintf(stderr, "\n[Stopped: program used too much memory (limit %d MB)]\n", MEM_LIMIT_MB);
    }

    CloseHandle(pi.hThread);
    CloseHandle(pi.hProcess);
    CloseHandle(job); /* kills anything the program left running */
    free(cmd);
    return (int)code;
}
