const map = L.map("map", {
  attributionControl: false
}).setView([13.5, 101], 6);

const input = document.getElementById("input");
const form = document.getElementById("guessForm");
const giveUp = document.getElementById("giveUp");
const message = document.getElementById("message");

const url =
  "https://raw.githubusercontent.com/chingchai/OpenGISData-Thailand/master/provinces.geojson";

let data = [];
let layer;
let target;
let guessed = new Set();
let provinceLayers = new Map();

function clean(text) {
  return String(text || "")
    .trim()
    .replace(/^จังหวัด/, "")
    .replace(/\s+/g, "")
    .replace(/กทม\.?/g, "กรุงเทพมหานคร")
    .replace(/กรุงเทพ$/g, "กรุงเทพมหานคร");
}

function name(feature) {
  return clean(feature.properties.pro_th);
}

function center(feature) {
  return L.geoJSON(feature).getBounds().getCenter();
}

function distance(a, b) {
  return map.distance(a, b) / 1000;
}

function color(km) {
  if (km < 50) return "#d32f2f";
  if (km < 100) return "#ef5350";
  if (km < 150) return "#ff7043";
  if (km < 220) return "#ffb74d";
  if (km < 300) return "#ffe082";
  if (km < 400) return "#fff3c4";
  if (km < 600) return "#fff8dc";
  if (km < 800) return "#fffbea";
  if (km < 1000) return "#fffdf2";
  if (km < 1200) return "#fffdf7";
  if (km < 1400) return "#fffdf9";
  if (km < 1600) return "#fffdfa";
  if (km < 1800) return "#fffdfb";
  if (km < 2000) return "#fffefc";
  return "#fffefd";
}
function resetMap() {
  provinceLayers.forEach(layer => {
    layer.setStyle({
      fillColor: "#ffffff",
      fillOpacity: 1,
      color: "#555",
      weight: 1
    });
  });
}

function newRound() {
  target = data[Math.floor(Math.random() * data.length)];
  guessed.clear();
  resetMap();

  input.value = "";
  input.focus();

  message.textContent = "ทายจังหวัดที่คิดว่าเป็นคำตอบ";
}

function finishRound(text) {
  message.textContent = text;

  setTimeout(() => {
    newRound();
  }, 1800);
}

function guess() {
  const text = clean(input.value);
  input.value = "";

  if (!text) {
    input.focus();
    return;
  }

  const feature = data.find(f => name(f) === text);

  if (!feature) {
    message.textContent = "ไม่พบจังหวัดนี้";
    input.focus();
    return;
  }

  const province = name(feature);

  if (guessed.has(province)) {
    message.textContent = "ทายจังหวัดนี้ไปแล้ว";
    input.focus();
    return;
  }

  guessed.add(province);

  const d = distance(
    center(feature),
    center(target)
  );

  const provinceLayer = provinceLayers.get(province);

  if (provinceLayer) {
    provinceLayer.setStyle({
      fillColor: color(d),
      fillOpacity: 1,
      color: "#555",
      weight: 1
    });
  }

  if (province === name(target)) {
    finishRound("🎉 ถูกต้อง!");
  } else {
    message.textContent = "ยังไม่ถูก ลองทายอีกจังหวัด";
  }

  input.focus();
}

function surrender() {
  const answer = name(target);
  const targetLayer = provinceLayers.get(answer);

  if (targetLayer) {
    targetLayer.setStyle({
      fillColor: "#43a047",
      fillOpacity: 1,
      color: "#555",
      weight: 1
    });
  }

  finishRound("ยอมแพ้! คำตอบคือ " + answer);
}

form.addEventListener("submit", e => {
  e.preventDefault();
  guess();
});

giveUp.addEventListener("click", surrender);

fetch(url)
  .then(r => {
    if (!r.ok) throw new Error();
    return r.json();
  })
  .then(json => {

    data = json.features.filter(f => name(f));

    if (data.length !== 77) {
      throw new Error("จังหวัดไม่ครบ 77 จังหวัด");
    }

    layer = L.geoJSON(json, {
      style: {
        color: "#555",
        weight: 1,
        fillColor: "#ffffff",
        fillOpacity: 1
      }
    }).addTo(map);

    layer.eachLayer(provinceLayer => {
      provinceLayers.set(
        name(provinceLayer.feature),
        provinceLayer
      );
    });

    map.fitBounds(layer.getBounds(), {
      padding: [10, 10]
    });

    newRound();
  })
  .catch(() => {
    message.textContent =
      "โหลดข้อมูลจังหวัดไม่สำเร็จ ลองรีเฟรชหน้าเว็บ";
  });