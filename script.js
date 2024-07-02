const { jsPDF } = window.jspdf;
const pdfjsLib = window["pdfjs-dist/build/pdf"];
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.6.347/pdf.worker.min.js";

const droppable = document.querySelector(".droppable");
const list = document.querySelector(".list");
const ball = document.querySelector(".ball");
const filledBall = document.querySelector(".filled-ball");
const hand = document.querySelector(".hand");

const filesArray = []; // 전역 배열로 파일 저장

const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

let isDraggingCount = 0;

document.addEventListener("dragover", (e) => {
  e.preventDefault();
  isDraggingCount++;
  if (isDraggingCount === 1) droppable.classList.add("is-dragging");
});

document.addEventListener("drop", (e) => {
  e.preventDefault();
  isDraggingCount = 0;
  droppable.classList.remove("is-dragging");
});

list.addEventListener("dragover", (e) => {
  e.preventDefault();
});

const dragtl = gsap.timeline({ paused: true });

dragtl
  .to(
    ball,
    { duration: 0.4, translateX: "286px", autoAlpha: 1, translateY: "-230px" },
    "drag"
  )
  .to(
    hand,
    {
      duration: 0.4,
      transformOrigin: "right",
      rotate: "66deg",
      translateY: "70px",
      translateX: "-20px",
    },
    "drag"
  );

list.addEventListener("dragenter", (e) => {
  e.preventDefault();
  droppable.classList.add("is-over");
  dragtl.play();
});

list.addEventListener("dragleave", (e) => {
  e.preventDefault();
  droppable.classList.remove("is-over");
  dragtl.reverse();
});

document.querySelector(".btn-upload").addEventListener("click", () => {
  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.multiple = true;
  fileInput.accept = "image/*,application/pdf"; // 이미지 및 PDF 파일만 허용

  fileInput.style.display = "none";

  fileInput.addEventListener("change", (e) => {
    handleFiles(e.target.files);
  });

  document.body.appendChild(fileInput);
  fileInput.click();
  document.body.removeChild(fileInput);
});

list.addEventListener("drop", (e) => {
  e.preventDefault();
  const { files } = e.dataTransfer;

  // 이미지 및 PDF 파일 필터링
  const allowedFiles = Array.from(files).filter(
    (file) => file.type.startsWith("image/") || file.type === "application/pdf"
  );

  if (allowedFiles.length === 0) {
    alert("Only image and PDF files are allowed.");
    dragtl.reverse();
    droppable.classList.remove("is-over");
    return;
  }

  handleFiles(allowedFiles);
  droppable.classList.remove("is-over");
});

const handleFiles = async (files) => {
  const items = Array.from(files).map((file) => {
    filesArray.push(file); // 파일을 배열에 저장
    return itemMarkup(file);
  });
  updateButtonState();
  requestAnimationFrame(() => {
    list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
  });
  for (const [index, file] of Array.from(files).entries()) {
    if (file.type.startsWith("image/")) {
      await processFile(file, items[index]);
    } else if (file.type === "application/pdf") {
      updateItemPdf(file, items[index]); // PDF 파일의 경우 바로 아이콘으로 대체
    }
  }
};

const updateItemPdf = (file, item) => {
  const itemImage = item.querySelector(".item-img");
  itemImage.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" fill="currentColor" class="bi bi-filetype-pdf" viewBox="0 0 16 16">
      <path fill-rule="evenodd" d="M14 4.5V14a2 2 0 0 1-2 2h-1v-1h1a1 1 0 0 0 1-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5zM1.6 11.85H0v3.999h.791v-1.342h.803q.43 0 .732-.173.305-.175.463-.474a1.4 1.4 0 0 0 .161-.677q0-.375-.158-.677a1.2 1.2 0 0 0-.46-.477q-.3-.18-.732-.179m.545 1.333a.8.8 0 0 1-.085.38.57.57 0 0 1-.238.241.8.8 0 0 1-.375.082H.788V12.48h.66q.327 0 .512.181.185.183.185.522m1.217-1.333v3.999h1.46q.602 0 .998-.237a1.45 1.45 0 0 0 .595-.689q.196-.45.196-1.084 0-.63-.196-1.075a1.43 1.43 0 0 0-.589-.68q-.396-.234-1.005-.234zm.791.645h.563q.371 0 .609.152a.9.9 0 0 1 .354.454q.118.302.118.753a2.3 2.3 0 0 1-.068.592 1.1 1.1 0 0 1-.196.422.8.8 0 0 1-.334.252 1.3 1.3 0 0 1-.483.082h-.563zm3.743 1.763v1.591h-.79V11.85h2.548v.653H7.896v1.117h1.606v.638z"/>
    </svg>`;
  gsap.to(itemImage, { autoAlpha: 1, duration: 0.3 });
};

const processFile = (file, item) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      const resizedImage = await resizeImage(e.target.result);
      updateItemImage(item, resizedImage);
      resolve(resizedImage); // 리사이즈된 이미지를 resolve
    };

    reader.onerror = (error) => {
      console.error("File reader error:", error);
      alert("An error occurred while reading the file.");
      reject(error);
    };

    reader.readAsDataURL(file);
  });
};

const resizeImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 3400; // jsPDF 페이지 크기 제한
      const MAX_HEIGHT = 3400; // jsPDF 페이지 크기 제한
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        0.7
      );
    };
    img.onerror = reject;
    img.src = src;
  });
};

const itemMarkup = (file) => {
  const item = document.createElement("div");
  const id = Math.random().toString(36).substr(2, 9);

  item.classList.add("item");
  item.setAttribute("id", id);
  item.innerHTML = `
    <div class="item-img">
      <div class="spinner" style="display: block;"></div>
    </div>
    <div class="item-details">
      <div class="item-name">${file.name}</div>
      <div class="item-size">SIZE: ${formatBytes(file.size)}</div>
    </div>
    <button class="item-delete" data-id="${id}">Delete</button>
  `;

  list.append(item);

  const itemDeleteBtn = item.querySelector(".item-delete");
  itemDeleteBtn.addEventListener("click", (e) => {
    deleteItem(e);
  });

  gsap
    .timeline({
      onComplete: () => {
        requestAnimationFrame(() => {
          list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
        });
      },
    })
    .set(item, { autoAlpha: 0 })
    .to(item, { autoAlpha: 1, duration: 0.3 })
    .to(
      item.querySelectorAll(".item-details, .item-delete"),
      { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0, scale: 1 },
      "-=0.3"
    );

  return item;
};

const updateItemImage = (item, url) => {
  const itemImage = item.querySelector(".item-img");
  itemImage.innerHTML = `<img src="${url}" loading="lazy" style="max-width: 100%; height: auto;" />`;

  gsap.to(itemImage, { autoAlpha: 1, duration: 0.3 });
};

const deleteItem = (e) => {
  const parent = e.target.parentNode;
  const children = parent.querySelectorAll(":scope > *");

  const deletetl = gsap.timeline({
    onComplete: () => {
      parent.remove();
      updateButtonState();
      if (!document.querySelector(".item")) dragtl.reverse();
    },
  });

  deletetl
    .to(children, { autoAlpha: 0, y: -10, duration: 0.2, stagger: 0.1 })
    .to(
      parent,
      { height: 0, paddingTop: 0, paddingBottom: 0, duration: 0.5 },
      "-=.15"
    );
};

const updateButtonState = () => {
  const items = document.querySelectorAll(".item");
  const combinedButton = document.querySelector(".btn-combined");
  const clearButton = document.querySelector(".btn-clear");
  if (items.length > 0) {
    combinedButton.classList.remove("disabled");
    clearButton.classList.remove("disabled");
  } else {
    combinedButton.classList.add("disabled");
    clearButton.classList.add("disabled");
  }
};

document.querySelector(".btn-clear").addEventListener("click", () => {
  const items = document.querySelectorAll(".item");
  items.forEach((item) => {
    const children = item.querySelectorAll(":scope > *");

    const deletetl = gsap.timeline({
      onComplete: () => {
        item.remove();
        updateButtonState();
        if (!document.querySelector(".item")) dragtl.reverse();
      },
    });

    deletetl
      .to(children, { autoAlpha: 0, y: -10, duration: 0.2, stagger: 0.1 })
      .to(
        item,
        { height: 0, paddingTop: 0, paddingBottom: 0, duration: 0.5 },
        "-=.15"
      );
  });
});

// PDF 변환 및 다운로드 기능 추가

document.querySelector(".btn-combined").addEventListener("click", async () => {
  const { PDFDocument, rgb } = PDFLib;
  const combinedPdf = await PDFDocument.create();
  const MAX_SIZE = 3400;
  const MARGIN = 10; // 페이지 간격

  const processImage = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");

          let width = img.width;
          let height = img.height;

          // 비율에 맞춰 크기 조정
          const scale = Math.min(MAX_SIZE / width, MAX_SIZE / height);
          width *= scale;
          height *= scale;

          canvas.width = width;
          canvas.height = height;
          context.drawImage(img, 0, 0, width, height);

          resolve({
            dataUrl: canvas.toDataURL("image/jpeg"),
            width: width,
            height: height,
          });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  for (const file of filesArray) {
    if (file.type.startsWith("image/")) {
      const { dataUrl, width, height } = await processImage(file);
      const img = await combinedPdf.embedJpg(dataUrl);
      const page = combinedPdf.addPage([
        width + MARGIN * 2,
        height + MARGIN * 2,
      ]);
      page.drawImage(img, {
        x: MARGIN,
        y: MARGIN,
        width: width,
        height: height,
      });
    } else if (file.type === "application/pdf") {
      const existingPdfBytes = await file.arrayBuffer();
      const existingPdf = await PDFDocument.load(existingPdfBytes);
      const copiedPages = await combinedPdf.copyPages(
        existingPdf,
        existingPdf.getPageIndices()
      );
      copiedPages.forEach((page) => combinedPdf.addPage(page));
    }
  }

  const pdfBytes = await combinedPdf.save();
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "combined.pdf";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});

// CSS to style the spinner inside each item
const style = document.createElement("style");
style.innerHTML = `
  .spinner {
    border: 4px solid rgba(0, 0, 0, 0.1);
    border-top-color: #000;
    border-radius: 50%;
    width: 26px;
    height: 26px;
    animation: spin 0.8s ease-in-out infinite;
    display: block;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
