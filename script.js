const droppable = document.querySelector(".droppable");
const list = document.querySelector(".list");
const ball = document.querySelector(".ball");
const filledBall = document.querySelector(".filled-ball");
const hand = document.querySelector(".hand");

const loader = createLoader();
document.body.appendChild(loader);

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
  fileInput.accept = "image/*";
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

  handleFiles(files);
  droppable.classList.remove("is-over");
});

const handleFiles = (files) => {
  loader.style.display = "block";
  const filePromises = Array.from(files).map((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = async (e) => {
        const resizedImage = await resizeImage(e.target.result);
        itemMarkup(file, resizedImage);
        resolve();
      };

      reader.onerror = (error) => {
        console.error("File reader error:", error);
        alert("An error occurred while reading the file.");
        reject(error);
      };
    });
  });

  Promise.all(filePromises)
    .then(() => {
      loader.style.display = "none";
      updateButtonState();
      requestAnimationFrame(() => {
        list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
      });
    })
    .catch((error) => {
      loader.style.display = "none";
      console.error("Error processing files:", error);
    });
};

const resizeImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
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

const itemMarkup = (file, url) => {
  const item = document.createElement("div");
  const id = Math.random().toString(36).substr(2, 9);

  item.classList.add("item");
  item.setAttribute("id", id);
  item.innerHTML = `
    <div class="item-img">
      <img src="${url}" loading="lazy" />
    </div>
    <div class="item-details">
      <div class="item-name">${file.name}</div>
      <div class="item-size">SIZE: ${formatBytes(file.size)}</div>
    </div>
    <button class="item-delete" data-id="${id}"></button>
  `;

  list.append(item);

  const itemDeleteBtn = item.querySelector(".item-delete");
  itemDeleteBtn.addEventListener("click", (e) => {
    deleteItem(e);
  });

  const itemImage = item.querySelector(".item-img");

  gsap
    .timeline({
      onComplete: () => {
        itemImage.style.opacity = 1;
        requestAnimationFrame(() => {
          list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
        });
      },
    })
    .set(item, { autoAlpha: 0 })
    .to(item, { autoAlpha: 1, duration: 0.3 })
    .fromTo(
      item.querySelectorAll(".item-details, .item-delete"),
      { autoAlpha: 0, y: 20 },
      { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.1 }
    )
    .fromTo(
      item.querySelector(".item-img img"),
      { scale: 0.8 },
      { scale: 1, duration: 0.3 },
      "-=0.3"
    );
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

function createLoader() {
  const loader = document.createElement("div");
  loader.classList.add("loader");
  loader.style.position = "fixed";
  loader.style.top = "50%";
  loader.style.left = "50%";
  loader.style.transform = "translate(-50%, -50%)";
  loader.style.zIndex = "9999";
  loader.style.display = "none";
  loader.innerHTML = `
    <div class="spinner"></div>
    <style>
      .spinner {
        border: 4px solid rgba(0, 0, 0, 0.1);
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border-top-color: #000;
        animation: spin 0.8s ease-in-out infinite;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    </style>
  `;
  return loader;
}
