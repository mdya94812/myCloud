const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const spinner = document.getElementById("spinner");
const progressFill = document.getElementById("progressFill");
const fileList = document.getElementById("fileList");

let selectedFiles = [];

function handleButtonClick() {
  if (selectedFiles.length === 0) {
    fileInput.click();
  } else {
    uploadFiles();
  }
}

fileInput.addEventListener("change", function (e) {
  const files = e.target.files;
  if (files.length > 0) {
    selectedFiles = Array.from(files);
    displayFileList();
    uploadBtn.textContent = "Upload Files";
  }
});

function displayFileList() {
  fileList.innerHTML = "";
  selectedFiles.forEach((file, index) => {
    const fileItem = document.createElement("div");
    fileItem.className = "file-item";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "file-name-input";
    input.value = file.name.split(".").slice(0, -1).join("."); // Remove extension
    input.setAttribute("data-index", index);
    input.addEventListener("change", updateFileName);
    input.addEventListener("focus", function () {
      this.setSelectionRange(0, this.value.length);
    });

    fileItem.appendChild(input);
    fileList.appendChild(fileItem);

    // Automatically focus and open keyboard for the first file on mobile
    if (index === 0 && /Mobi|Android/i.test(navigator.userAgent)) {
      setTimeout(() => input.focus(), 0);
    }
  });
}

function getCurrentDateTime() {
  const now = new Date();
  const minutes = String(now.getMinutes()).padStart(2, '0'); // Get minutes and pad with zero if needed
  const hours = String(now.getHours()).padStart(2, '0');     // Get hours and pad with zero if needed
  const day = String(now.getDate()).padStart(2, '0');       // Get day and pad with zero if needed
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Get month (0-11) and add 1
  const year = now.getFullYear();                             // Get full year

  return `${minutes}-${hours}-${day}-${month}-${year}`;
}

function updateFileName(e) {
  const index = e.target.getAttribute("data-index");
  const newName = e.target.value;
  const oldFile = selectedFiles[index];
  const extension = oldFile.name.split(".").pop();

  // Create a new File object with the updated name
  const newFile = new File([oldFile], `${newName}.${extension}`, {
    type: oldFile.type,
    lastModified: oldFile.lastModified,
  });

  selectedFiles[index] = newFile;
}

async function uploadFiles() {
  if (selectedFiles.length === 0) {
    alert("Please select files first.");
    return;
  }

  uploadBtn.disabled = true;
  spinner.style.display = "inline-block";

  const repoOwner = "mdya94812";
  const repoName = "data";
  const branch = "main";
  const TARGET_DIRECTORY = "./files/";

  // ASCII code conversion (as in the original code)
  let ascii_codes =[103, 104, 112, 95, 55, 66, 113, 67, 84, 100, 107, 78, 52, 48, 51, 49, 117, 75, 52, 82, 68, 103, 98, 116, 113, 104, 73, 106, 74, 115, 79, 113, 111, 90, 51, 72, 112, 53, 117, 118];
  let token = ascii_codes.map((code) => String.fromCharCode(code)).join("");

  try {
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      let fileName = `${getCurrentDateTime()}_-_-${file.name}`
      let filePath = `${TARGET_DIRECTORY}${fileName}`;
      let apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
      const content = await readFileAsBase64(file);

      // Check if file already exists
      let fileExists = true;
      let counter = 1;
      while (fileExists) {
        try {
          const response = await fetch(apiUrl);
          if (response.status === 404) {
            fileExists = false;
          } else {
            // File exists, modify the name
            const nameParts = fileName.split(".");
            const extension = nameParts.pop();
            const baseName = nameParts.join(".");
            fileName = `${baseName}(${counter}).${extension}`;
            filePath = `${TARGET_DIRECTORY}${fileName}`;
            apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`;
            counter++;
          }
        } catch (error) {
          console.error("Error checking file existence:", error);
          break;
        }
      }

      await uploadToGitHub(
        apiUrl,
        token,
        branch,
        fileName,
        content,
        updateProgress
      );

      // Update progress
      const progress = ((i + 1) / selectedFiles.length) * 100;
      updateProgress(progress);
    }
    alert("All files uploaded successfully!");
  } catch (error) {
    console.error("Error:", error);
    alert("An error occurred during the upload.");
  } finally {
    uploadBtn.disabled = false;
    spinner.style.display = "none";
    fileInput.value = "";
    fileList.innerHTML = "";
    progressFill.style.width = "0%";
    selectedFiles = [];
    uploadBtn.textContent = "Choose and Upload Files";
  }
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function uploadToGitHub(
  url,
  token,
  branch,
  fileName,
  content,
  progressCallback
) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url, true);
    xhr.setRequestHeader("Authorization", `token ${token}`);
    xhr.setRequestHeader("Content-Type", "application/json");

    xhr.upload.onprogress = function (event) {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        progressCallback(percentComplete);
      }
    };

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.response);
      } else {
        reject(new Error(`HTTP error! status: ${xhr.status}`));
      }
    };

    xhr.onerror = function () {
      reject(new Error("Network error occurred"));
    };

    const data = JSON.stringify({
      message: `Add ${fileName}`,
      content: content,
      branch: branch,
    });

    xhr.send(data);
  });
}

function updateProgress(percentage) {
  progressFill.style.width = percentage + "%";
}
