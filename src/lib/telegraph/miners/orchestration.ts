export type MinerAttemptFailure = {
  role: "primary" | "backup";
  code: string;
  message: string;
};

export type MinerSelectionResult<T> =
  | {
      available: true;
      evidence: T;
      role: "primary" | "backup";
      failures: MinerAttemptFailure[];
    }
  | { available: false; failures: MinerAttemptFailure[] };

function failure(
  role: "primary" | "backup",
  error: unknown,
): MinerAttemptFailure {
  return {
    role,
    code:
      error instanceof Error && "code" in error
        ? String(error.code)
        : "MINER_UNAVAILABLE",
    message:
      error instanceof Error
        ? error.message.slice(0, 300)
        : "The Miner is unavailable.",
  };
}

export async function runPrimaryBackup<T>(input: {
  primary: () => Promise<T>;
  backup: () => Promise<T>;
  shouldTryBackup?: (error: unknown) => boolean;
}): Promise<MinerSelectionResult<T>> {
  const failures: MinerAttemptFailure[] = [];
  try {
    return {
      available: true,
      evidence: await input.primary(),
      role: "primary",
      failures,
    };
  } catch (error) {
    failures.push(failure("primary", error));
    if (input.shouldTryBackup && !input.shouldTryBackup(error)) {
      return { available: false, failures };
    }
  }

  try {
    return {
      available: true,
      evidence: await input.backup(),
      role: "backup",
      failures,
    };
  } catch (error) {
    failures.push(failure("backup", error));
    return { available: false, failures };
  }
}
