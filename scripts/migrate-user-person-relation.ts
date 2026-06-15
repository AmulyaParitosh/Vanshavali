import * as fs from "fs";
import * as path from "path";

const USERS_PATH = "/Users/amulyaparitosh/Projects/proj/Vanshavali/.local_data/db/users.json";
const PEOPLE_PATH = "/Users/amulyaparitosh/Projects/proj/Vanshavali/.local_data/db/people.json";

function migrate() {
  console.log("Starting migration...");

  if (!fs.existsSync(USERS_PATH)) {
    console.error("Users file not found");
    return;
  }
  if (!fs.existsSync(PEOPLE_PATH)) {
    console.error("People file not found");
    return;
  }

  const users = JSON.parse(fs.readFileSync(USERS_PATH, "utf-8"));
  const people = JSON.parse(fs.readFileSync(PEOPLE_PATH, "utf-8"));

  const uidToPersonId = new Map<string, string>();
  const personIdToUid = new Map<string, string>();

  // 1. Collect existing links and identify collisions
  for (const uid in users) {
    const profile = users[uid];
    if (profile.personId) {
      uidToPersonId.set(uid, profile.personId);

      if (personIdToUid.has(profile.personId)) {
        console.warn(
          `Collision detected: User ${uid} and User ${personIdToUid.get(profile.personId)} both link to Person ${profile.personId}. Keeping original link.`
        );
      } else {
        personIdToUid.set(profile.personId, uid);
      }

      // Remove personId from user profile
      delete profile.personId;
    }
  }

  // 2. Update people with userId
  let updatedCount = 0;
  for (const person of people) {
    const uid = personIdToUid.get(person.id);
    if (uid) {
      person.userId = uid;
      updatedCount++;
      console.log(`Linked Person ${person.id} to User ${uid}`);
    }
  }

  // 3. Save files
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
  fs.writeFileSync(PEOPLE_PATH, JSON.stringify(people, null, 2));

  console.log(`Migration complete. Updated ${updatedCount} people.`);
}

migrate();
