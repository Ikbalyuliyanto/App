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

