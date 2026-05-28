# Security Specification: Tactical Legends Firebase Security

This document details the security specification, invariants, malicious attack payloads, and a test runner validating that all unauthorized access attempts are rejected by the Firestore rules.

## 1. Data Invariants

- **User Profile (`users/{userId}`)**:
  - The document ID (`userId`) must strictly match `request.auth.uid`.
  - Only the authenticated owner can read or write their own profile details.
  - The field `email` must match the authenticated token email `request.auth.token.email`.
  - The email must have `email_verified == true`.
  - Users cannot set or modify other users' documents.
  - `createdAt` is immutable and must equal `request.time`.
  - `updatedAt` on update must equal `request.time`.
  - `highScore` must be a valid non-negative integer.

- **Leaderboard Entry (`leaderboard/{entryId}`)**:
  - Any user can read (list) the leaderboard, but the query size must be restricted.
  - Creating a record requires authenticating as the user listed in the payload (`userId == request.auth.uid`).
  - Entries are entirely immutable (cannot be updated, cannot be deleted) once written, ensuring integrity of high scores.
  - `score` must be a non-negative integer.
  - `createdAt` must equal `request.time`.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following payloads attempt to violate identity, integrity, or structure, and must be strictly denied by the Firestore rules:

1. **Identity Spoofing - Create Profile for Other User**:
   - Authentication: Auth UID = `player_alpha`
   - Attempt: Create document at `users/player_beta` with `displayName: "Beta"`.
   - Result: `PERMISSION_DENIED` (UID mismatch).

2. **Privilege Escalation - Update Admin Role/Custom Fields**:
   - Authentication: Auth UID = `player_alpha`
   - Attempt: Write `role: "admin"` or `isAdmin: true` into own profile document.
   - Result: `PERMISSION_DENIED` (fields not in allowed update schema).

3. **Email Hijack / Spoofing**:
   - Authentication: Auth UID = `player_alpha`, email = `player_alpha@gmail.com`
   - Attempt: Create user profile with `email: "admin@google.com"`.
   - Result: `PERMISSION_DENIED` (email string must match auth token email).

4. **Resource Poisoning - Oversized Username Attack**:
   - Authentication: Auth UID = `player_alpha`
   - Attempt: Create profile with `displayName` consisting of a random 1MB long string.
   - Result: `PERMISSION_DENIED` (`displayName.size() <= 100` violation).

5. **Temporal Integrity Trick - Spoofed Created Timestamp**:
   - Authentication: Auth UID = `player_alpha`
   - Attempt: Create profile with `createdAt: Timestamp(2030, 1, 1)` (future date).
   - Result: `PERMISSION_DENIED` (`createdAt == request.time` violation).

6. **State Corruptor - Negative Scores Injection**:
   - Authentication: Auth UID = `player_alpha`
   - Attempt: Post `highScore: -9999` to `users/player_alpha`.
   - Result: `PERMISSION_DENIED` (must be non-negative integer).

7. **Email Verification Bypass**:
   - Authentication: Auth UID = `player_alpha`, email = `unverified@gmail.com` with `email_verified: false`
   - Attempt: Create user profile at `users/player_alpha`.
   - Result: `PERMISSION_DENIED` (strictly requires `email_verified == true`).

8. **Leaderboard Tampering - Modify Existing High Score**:
   - Authentication: Auth UID = `player_alpha`
   - Attempt: Update an entry at `leaderboard/alpha_top_run` to set `score: 999999`.
   - Result: `PERMISSION_DENIED` (update operations are block-denied).

9. **Leaderboard Cleansing - Delete Enemy Scores**:
   - Authentication: Auth UID = `player_alpha`
   - Attempt: Delete document `leaderboard/enemy_top_run`.
   - Result: `PERMISSION_DENIED` (delete operations are block-denied).

10. **Shadow Key Attack - Ghost Field Injection**:
    - Authentication: Auth UID = `player_alpha`
    - Attempt: Create user profile including undocumented field `hackedStatus: "godmode"`.
    - Result: `PERMISSION_DENIED` (`keys().size() == N` and exact schema match).

11. **ID Injection Poisoning - Malformed Alpha ID**:
    - Authentication: Auth UID = `player_alpha`
    - Attempt: Create document at `users/%20malicious%20id%20`.
    - Result: `PERMISSION_DENIED` (regex guard `isValidId` violation).

12. **Null/Type Poisoning - Boolean value in Numeric Field**:
    - Authentication: Auth UID = `player_alpha`
    - Attempt: Create leaderboard entry with `score: true`.
    - Result: `PERMISSION_DENIED` (type check `score is int` violation).

---

## 3. The Test Suite Runner

This test file (`firestore.rules.test.ts`) simulates the Firestore local emulator to verify that all Twelve payload attacks are successfully prevented by the security engine.

```typescript
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import * as fs from "fs";

let testEnv: RulesTestEnvironment;

describe("Tactical Legends Security Invariant Tests", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "nexus-one-493108",
      firestore: {
        rules: fs.readFileSync("firestore.rules", "utf8"),
        host: "localhost",
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it("1. Denies creating a profile for another user", async () => {
    const context = testEnv.authenticatedContext("player_alpha", {
      email: "alpha@gmail.com",
      email_verified: true,
    });
    const db = context.firestore();
    const maliciousRef = doc(db, "users", "player_beta");
    await assertFails(
      setDoc(maliciousRef, {
        displayName: "Beta",
        email: "alpha@gmail.com",
        highScore: 100,
        createdAt: new Date(),
      })
    );
  });

  it("2. Denies privilege escalation field injection during profile updates", async () => {
    const context = testEnv.authenticatedContext("player_alpha", {
      email: "alpha@gmail.com",
      email_verified: true,
    });
    const db = context.firestore();
    const docRef = doc(db, "users", "player_alpha");
    
    // Setup initial
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "users", "player_alpha"), {
        displayName: "Alpha",
        email: "alpha@gmail.com",
        highScore: 100,
        createdAt: new Date(),
      });
    });

    await assertFails(
      updateDoc(docRef, {
        role: "admin",
        updatedAt: new Date(),
      })
    );
  });

  it("3. Denies creating user profile with unauth email mismatch", async () => {
    const context = testEnv.authenticatedContext("player_alpha", {
      email: "alpha@gmail.com",
      email_verified: true,
    });
    const db = context.firestore();
    const docRef = doc(db, "users", "player_alpha");
    await assertFails(
      setDoc(docRef, {
        displayName: "Alpha",
        email: "spoofed_admin@gmail.com",
        highScore: 50,
        createdAt: new Date(),
      })
    );
  });

  it("4. Denies oversized display titles to contain costs", async () => {
    const context = testEnv.authenticatedContext("player_alpha", {
      email: "alpha@gmail.com",
      email_verified: true,
    });
    const db = context.firestore();
    const docRef = doc(db, "users", "player_alpha");
    const longName = "a".repeat(200);
    await assertFails(
      setDoc(docRef, {
        displayName: longName,
        email: "alpha@gmail.com",
        highScore: 0,
        createdAt: new Date(),
      })
    );
  });

  it("5. Guard against spoofed client-side timestamps", async () => {
    const context = testEnv.authenticatedContext("player_alpha", {
      email: "alpha@gmail.com",
      email_verified: true,
    });
    const db = context.firestore();
    const docRef = doc(db, "users", "player_alpha");
    await assertFails(
      setDoc(docRef, {
        displayName: "Alpha",
        email: "alpha@gmail.com",
        highScore: 0,
        createdAt: new Date(2050, 1, 1),
      })
    );
  });

  it("6. Denies corrupted negative scores", async () => {
    const context = testEnv.authenticatedContext("player_alpha", {
      email: "alpha@gmail.com",
      email_verified: true,
    });
    const db = context.firestore();
    const docRef = doc(db, "users", "player_alpha");
    await assertFails(
      setDoc(docRef, {
        displayName: "Alpha",
        email: "alpha@gmail.com",
        highScore: -50,
        createdAt: new Date(),
      })
    );
  });

  it("7. Denies unverified user logins", async () => {
    const context = testEnv.authenticatedContext("player_alpha", {
      email: "unverified@gmail.com",
      email_verified: false,
    });
    const db = context.firestore();
    const docRef = doc(db, "users", "player_alpha");
    await assertFails(
      setDoc(docRef, {
        displayName: "Unverified",
        email: "unverified@gmail.com",
        highScore: 0,
        createdAt: new Date(),
      })
    );
  });

  it("8. Denies high score modifications to leaderboard entries", async () => {
    const context = testEnv.authenticatedContext("player_alpha", {
      email: "alpha@gmail.com",
      email_verified: true,
    });
    const db = context.firestore();
    const entryRef = doc(db, "leaderboard", "alpha_run");

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "leaderboard", "alpha_run"), {
        name: "Alpha",
        score: 100,
        legend: "sniper",
        userId: "player_alpha",
        createdAt: new Date(),
      });
    });

    await assertFails(
      updateDoc(entryRef, {
        score: 99999,
      })
    );
  });

  it("9. Guard against deleting existing records of other players", async () => {
    const context = testEnv.authenticatedContext("player_alpha", {
      email: "alpha@gmail.com",
      email_verified: true,
    });
    const db = context.firestore();
    const entryRef = doc(db, "leaderboard", "beta_run");

    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "leaderboard", "beta_run"), {
        name: "Beta",
        score: 120,
        legend: "medic",
        userId: "player_beta",
        createdAt: new Date(),
      });
    });

    await assertFails(deleteDoc(entryRef));
  });

  it("10. Rejects shadow status keys", async () => {
    const context = testEnv.authenticatedContext("player_alpha", {
      email: "alpha@gmail.com",
      email_verified: true,
    });
    const db = context.firestore();
    const docRef = doc(db, "users", "player_alpha");
    await assertFails(
      setDoc(docRef, {
        displayName: "Alpha",
        email: "alpha@gmail.com",
        highScore: 0,
        createdAt: new Date(),
        hackedStatus: "godmode",
      })
    );
  });

  it("11. Prevents malformed path ID character poisoning", async () => {
    const context = testEnv.authenticatedContext("player_alpha", {
      email: "alpha@gmail.com",
      email_verified: true,
    });
    const db = context.firestore();
    const badRef = doc(db, "users", "%20poisoned%20");
    await assertFails(
      setDoc(badRef, {
        displayName: "Alpha",
        email: "alpha@gmail.com",
        highScore: 0,
        createdAt: new Date(),
      })
    );
  });

  it("12. Confirms strict type validation on numeric parameters", async () => {
    const context = testEnv.authenticatedContext("player_alpha", {
      email: "alpha@gmail.com",
      email_verified: true,
    });
    const db = context.firestore();
    const entryRef = doc(db, "leaderboard", "run_id_3");
    await assertFails(
      setDoc(entryRef, {
        name: "Alpha",
        score: "non-integer-string",
        legend: "sniper",
        userId: "player_alpha",
        createdAt: new Date(),
      })
    );
  });
});
```
