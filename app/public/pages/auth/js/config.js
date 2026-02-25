const API_BASE =
  window.location.hostname === "ashanum.com"
    ? "https://ashanum.com"
    : `http://${window.location.hostname}:9876`;

window.API_BASE = API_BASE;
console.log(API_BASE);