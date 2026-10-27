# SkillOS Students — AI-Powered Learning Platform

A premium student workspace built using standard web assets and Google Gemini AI models.

## 📁 Project Structure
- `/index.html` - Premium landing page with layout visual previews.
- `/login.html` - Google OAuth & Email validation split layout tabs.
- `/register.html` - Query helper redirecting to registration tabs.
- `/dashboard.html` - Main student tracking panel, streaks, suggested courses, and activities.
- `/courses.html` - Catalog database explorer with multi-select inputs.
- `/course-details.html` - Interactive curriculum timeline viewer and completion nodes.
- `/ai-coach.html` - Chat assistant client with customized subject tags.
- `/assessments.html` - Diagnostics testing environment.
- `/progress.html` - Dynamic Chart.js donuts, Circular progress meters, activity logs, and heatmaps.
- `/certificates.html` - Verifiable credentials printable PDF certificates generator.
- `/profile.html` - User biography update settings.
- `/settings.html` - Notification triggers and learning preferences dashboard.
- `/about.html` & `/contact.html` - Info & message query channels.
- `/css/` - Master styles sheets, animation sets, responsive breakpoints.
- `/js/` - Modular controllers coordinating Auth states, Firestore updates, and Gemini AI completions.
- `/firebase/` - Initialiser config profiles.

## 🚀 Setup & Launch
1. Open [`firebase/firebase-config.js`](file:///c:/Users/user/Desktop/SkillOS%20Stundents/firebase/firebase-config.js) and configure your Firebase credentials.
2. Enable Auth (Email & Google), Firestore Database, and Storage inside your Firebase console.
3. Add your Gemini api credentials inside [`js/ai-coach.js`](file:///c:/Users/user/Desktop/SkillOS%20Stundents/js/ai-coach.js).
4. Run locally via a local HTTP server:
   ```bash
   npx serve .
   ```
