// API Configuration
let API_BASE;
if (window.location.hostname === "localhost") {
  // DEV
  API_BASE = "http://localhost:9876";
} else {
  // PROD
  API_BASE = "https://ashanum.com";
}
window.API_BASE = API_BASE;

const GOOGLE_CLIENT_ID = "1015410214032-ocr8mocppr8734l0sdq9c8haba76mtcp.apps.googleusercontent.com";