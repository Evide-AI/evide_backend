#!/usr/bin/env node
import "dotenv/config.js";
import readline from "readline";
import { sequelize } from "./config/db.js";
import User from "./api/models/User.js";

/**
 * Prompts the user for input.
 * @param {string} query The text to display to the user.
 * @param {boolean} [silent=false] If true, the user's input will be hidden.
 * @returns {Promise<string>} A promise that resolves with the user's answer.
 */
function prompt(query, silent = false) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    // Mute the output stream if the input should be silent (for passwords)
    if (silent) {
      rl.output.mute = true;
    }

    rl.question(query, (answer) => {
      // Unmute and add a newline for cleaner output after the prompt is done
      if (silent) {
        rl.output.mute = false;
        rl.output.write("\n");
      }
      rl.close();
      resolve(answer);
    });

    // Handle the mute behavior for the readline interface
    if (silent) {
      rl._writeToOutput = function _writeToOutput(stringToWrite) {
        if (rl.output.mute) {
          // Write asterisks instead of the actual characters
          rl.output.write("*");
        } else {
          rl.output.write(stringToWrite);
        }
      };
    }
  });
}

async function createAdmin() {
  try {
    await sequelize.authenticate();

    const email = await prompt("Enter admin email: ");
    // Basic email validation
    if (!email || !email.includes("@")) {
      console.error("Invalid email provided.");
      process.exit(1);
    }

    const password = await prompt(
      "Enter admin password (min length 8): ",
      true,
    );
    // Basic password validation
    if (!password || password.length < 8) {
      console.error("Password must be at least 8 characters long.");
      process.exit(1);
    }

    const normalizedEmail = email.toLowerCase();
    const userType = "admin";

    // Check if user already exists
    const existingUser = await User.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      console.error("An admin with this email already exists.");
      process.exit(1);
    }

    // Create the new user
    const newUser = await User.create({
      email: normalizedEmail,
      password: password,
      role: userType,
    });

    console.log(`Admin user created successfully for: ${newUser.email}`);
  } catch (error) {
    console.error("Error creating admin:", error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

createAdmin();
