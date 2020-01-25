// File Upload
//
function ekUpload() {
  function Init() {
    console.log("Upload Initialised");

    var fileSelect = document.getElementById("file-upload");
    var fileDrag = document.getElementById("file-drag");
    var body = document.getElementById("body");
    var submitButton = document.getElementById("submit-button");

    fileSelect.addEventListener("change", fileSelectHandler, false);

    // File Drop
    fileDrag.addEventListener("dragover", fileDragHover, false);
    fileDrag.addEventListener("dragleave", fileDragHover, false);
    fileDrag.addEventListener("drop", fileSelectHandler, false);
    body.addEventListener("paste", handlePaste);
  }

  function uuidv4() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
      (
        c ^
        (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))
      ).toString(16)
    );
  }

  function fileDragHover(e) {
    var fileDrag = document.getElementById("file-drag");

    e.stopPropagation();
    e.preventDefault();

    fileDrag.className =
      e.type === "dragover" ? "hover" : "modal-body file-upload";
  }

  function fileSelectHandler(e) {
    // Fetch FileList object
    var files = e.target.files || e.dataTransfer.files;

    // Cancel event and hover styling
    fileDragHover(e);

    // Process all File objects
    for (var i = 0, f; (f = files[i]); i++) {
      parseFile(f);
      uploadFile(f);
    }
  }

  // Output
  function output(msg) {
    // Response
    var m = document.getElementById("messages");
    m.innerHTML = msg;
  }

  function parseFile(file) {
    console.log(file.name);
    output("<strong>" + encodeURI(file.name) + "</strong>");

    var imageName = file.name;

    var isGood = /\.(?=gif|jpg|png|jpeg)/gi.test(imageName);
    if (isGood) {
      document.getElementById("start").classList.add("hidden");
      document.getElementById("response").classList.remove("hidden");
      document.getElementById("notimage").classList.add("hidden");
      // Thumbnail Preview
      document.getElementById("file-image").classList.remove("hidden");
      document.getElementById("file-image").src = URL.createObjectURL(file);
    } else {
      document.getElementById("file-image").classList.add("hidden");
      document.getElementById("notimage").classList.remove("hidden");
      document.getElementById("start").classList.remove("hidden");
      document.getElementById("response").classList.add("hidden");
      document.getElementById("file-upload-form").reset();
    }
  }

  function setProgressMaxValue(e) {
    var pBar = document.getElementById("file-progress");

    if (e.lengthComputable) {
      pBar.max = e.total;
    }
  }

  function getCookie(name) {
    var value = "; " + document.cookie;
    var parts = value.split("; " + name + "=");
    if (parts.length == 2)
      return parts
        .pop()
        .split(";")
        .shift();
  }

  function updateFileProgress(e) {
    var pBar = document.getElementById("file-progress");

    if (e.lengthComputable) {
      pBar.value = e.loaded;
    }
  }

  function uploadFile(file) {
    var xhr = new XMLHttpRequest();
    var data = new FormData();
    pBar = document.getElementById("file-progress");
    fileSizeLimit = 5120; // In MB
    if (xhr.upload) {
      // Check if file is less than x MB
      if (file.size <= fileSizeLimit * 1024 * 1024) {
        // Progress bar
        pBar.style.display = "inline";
        xhr.upload.addEventListener("loadstart", setProgressMaxValue, false);
        xhr.upload.addEventListener("progress", updateFileProgress, false);

        // File received / failed
        xhr.upload.onprogress = function(e) {
          var percentComplete = (e.loaded / e.total) * 100;
          pBar.className = xhr.status == 200 ? "success" : "failure";
        };

        // Start upload
        xhr.onerror = function() {
          alert("Error! Upload failed. Can not connect to server.");
        };

        xhr.open("POST", "/api/upload");
        var token = getCookie("_csrf");
        console.log(token);
        xhr.setRequestHeader("X-CSRF-Token", token);

        data.append("files", file, file.name);
        xhr.send(data);

        xhr.onreadystatechange = function() {
          if (xhr.readyState == XMLHttpRequest.DONE) {
            if (xhr.responseText) {
              links = JSON.parse(xhr.responseText);
              if (links.length) {
                links.forEach(link => {
                  output(`<a href="/${link}" target="_blank">${link}</a>`);
                });
              }
            }
          }
        };
      } else {
        output("Please upload a smaller file (< " + fileSizeLimit + " MB).");
      }
    }
  }

  function handlePaste(e) {
    for (var i = 0; i < e.clipboardData.items.length; i++) {
      var item = e.clipboardData.items[i];
      console.log("Item: " + item.type);
      if (item.type.indexOf("image -1")) {
        parseFile(item.getAsFile());
        uploadFile(item.getAsFile());
      } else {
        console.log("Discardingimage paste data");
      }
    }
  }

  if (window.File && window.FileList && window.FileReader) {
    Init();
  } else {
    document.getElementById("file-drag").style.display = "none";
  }
}
ekUpload();
