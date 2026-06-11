const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const User = require("./src/models/User");
const CandidateProfile = require("./src/models/CandidateProfile");

async function debug() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const user = await User.findOne({ email: "tester@gmail.com" });
    if (!user) {
      console.log("User not found");
      return;
    }
    console.log("--- USER RECORD ---");
    console.log(user._id.toString());
    console.log(user.name);
    console.log(user.email);
    console.log(user.department);

    const profile = await CandidateProfile.findOne({ userId: user._id });
    if (!profile) {
      console.log("Profile not found for userId:", user._id);
      return;
    }
    console.log("--- PROFILE RECORD ---");
    console.log("Phone:", profile.phone);
    console.log("AltPhone:", profile.altPhone);
    console.log("Headline:", profile.headline);
    console.log("Summary:", profile.summary);
    console.log("Title:", profile.currentTitle);
    console.log("Company:", profile.currentCompany);
    console.log("City:", profile.currentCity);

  } catch (err) {
    console.error(err);
  } finally {
    await mongoose.disconnect();
  }
}

debug();