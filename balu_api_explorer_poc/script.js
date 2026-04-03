const BASE_URL = "https://jsonplaceholder.typicode.com";
const responseBox = document.getElementById("response");

document.getElementById("fileInput").addEventListener("change", function(e) {
  const file = e.target.files[0];

  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.onload = function(event) {
    const data = JSON.parse(event.target.result);
    displayEndpoints(data.paths);
  };

  reader.readAsText(file);
});

function displayEndpoints(paths) {
  const container = document.getElementById("endpoints");
  container.innerHTML = "";

  for (let path in paths) {
    for (let method in paths[path]) {
      const row = document.createElement("div");
      row.className = "endpoint-row";

      const apiButton = document.createElement("button");
      apiButton.innerText = "Call API";
      apiButton.className = "api-btn";
      apiButton.title = method.toUpperCase() + " " + path;

      apiButton.addEventListener("click", function() {
        callApi(path, method);
      });

      const endpointLabel = document.createElement("span");
      endpointLabel.className = "endpoint-label";
      endpointLabel.innerText = method.toUpperCase() + " " + path;

      const explainButton = document.createElement("button");
      explainButton.innerText = "Explain API";
      explainButton.className = "explain-btn";

      explainButton.addEventListener("click", function() {
        explainApi(path, method);
      });

      row.appendChild(endpointLabel);
      row.appendChild(apiButton);
      row.appendChild(explainButton);
      container.appendChild(row);
    }
  }
}

function callApi(path, method) {
  const url = BASE_URL + path;

  responseBox.textContent = "Loading...";

  fetch(url, {
    method: method.toUpperCase()
  })
    .then(function(response) {
      const statusText = "Status: " + response.status + " " + response.statusText;

      if (!response.ok) {
        throw new Error(statusText);
      }

      return response.json().then(function(data) {
        return {
          statusText: statusText,
          data: data
        };
      });
    })
    .then(function(result) {
      responseBox.textContent =
        result.statusText + "\n\n" + JSON.stringify(result.data, null, 2);
    })
    .catch(function(error) {
      responseBox.textContent = "Error: " + error.message;
    });
}

function explainApi(path, method) {
  const message =
    "This endpoint " +
    method.toUpperCase() +
    " " +
    path +
    " fetches user data from the server";

  responseBox.textContent = message;
}
