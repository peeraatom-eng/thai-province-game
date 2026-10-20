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
let thailandBounds;

// ทำความสะอาดชื่อจังหวัดก่อนนำไปเปรียบเทียบ
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

// หาจุดกึ่งกลางจังหวัด
function center(feature) {
  return L.geoJSON(feature).getBounds().getCenter();
}

// คำนวณระยะทางเป็นกิโลเมตร
function distance(a, b) {
  return map.distance(a, b) / 1000;
}

// สีแต่ละระดับ แยกกันชัดเจน
function color(km) {
  if (km < 50) return "#d32f2f";
  if (km < 100) return "#e53935";
  if (km < 150) return "#f4511e";
  if (km < 220) return "#f56c24";
  if (km < 300) return "#fb8c00";
  if (km < 400) return "#ffa000";
  if (km < 500) return "#ffb300";
  if (km < 650) return "#ffc107";
  if (km < 800) return "#fdd835";
  if (km < 1000) return "#f9e547";
  if (km < 1200) return "#f5e85b";
  return "#f0e66a";
}

// คืนสีทุกจังหวัดเป็นสีขาว
function resetMap() {
  provinceLayers.forEach(provinceLayer => {
    provinceLayer.setStyle({
      fillColor: "#ffffff",
      fillOpacity: 1,
      color: "#555",
      weight: 1
    });
  });
}

// ซูมกลับไปดูประเทศไทยทั้งหมด
function zoomOutToThailand() {
  if (thailandBounds) {
    map.flyToBounds(thailandBounds, {
      padding: [10, 10],
      maxZoom: 6,
      duration: 0.6
    });
  }
}

// เริ่มรอบใหม่
function newRound() {
  target = data[Math.floor(Math.random() * data.length)];

  guessed.clear();
  resetMap();
  zoomOutToThailand();

  input.value = "";
  input.focus();

  message.textContent = "ทายจังหวัดที่คิดว่าเป็นคำตอบ";
}

// จบรอบแล้วเริ่มใหม่
function finishRound(text) {
  message.textContent = text;

  setTimeout(() => {
    newRound();
  }, 1800);
}

// ซูมไปยังจังหวัดที่เพิ่งทาย
function zoomToProvince(provinceLayer) {
  if (!provinceLayer) return;

  map.flyToBounds(provinceLayer.getBounds(), {
    padding: [100, 100],
    maxZoom: 6,
    duration: 0.8
  });
}

// ตรวจคำตอบ
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

    // ซูมไปจังหวัดที่เพิ่งทาย
    zoomToProvince(provinceLayer);
  }

  if (province === name(target)) {
    // ถ้าทายถูก เปลี่ยนเป็นสีเขียว
    if (provinceLayer) {
      provinceLayer.setStyle({
        fillColor: "#43a047",
        fillOpacity: 1,
        color: "#555",
        weight: 1
      });
    }

    finishRound("🎉 ถูกต้อง!");
  } else {
    message.textContent = "ยังไม่ถูก ลองทายอีกจังหวัด";
  }

  input.focus();
}

// ยอมแพ้และเปิดเผยจังหวัดคำตอบ
function surrender() {
  if (!target) return;

  const answer = name(target);
  const targetLayer = provinceLayers.get(answer);

  if (targetLayer) {
    targetLayer.setStyle({
      fillColor: "#43a047",
      fillOpacity: 1,
      color: "#555",
      weight: 1
    });

    // ซูมไปจังหวัดคำตอบด้วย
    zoomToProvince(targetLayer);
  }

  finishRound("ยอมแพ้! คำตอบคือ " + answer);
}

// กดปุ่มทายหรือ Enter
form.addEventListener("submit", e => {
  e.preventDefault();
  guess();
});

giveUp.addEventListener("click", surrender);

// โหลดข้อมูลแผนที่ประเทศไทย
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

    thailandBounds = layer.getBounds();

    map.fitBounds(thailandBounds, {
      padding: [10, 10]
    });

    newRound();
  })
  .catch(() => {
    message.textContent =
      "โหลดข้อมูลจังหวัดไม่สำเร็จ ลองรีเฟรชหน้าเว็บ";
  });
