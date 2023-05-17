function createButton() {
  const button = document.createElement('button');
  button.textContent = 'Submit File';
  
  // Updated styling properties for a professional and modern appearance
  button.style.backgroundColor = '#4a4a4a';
  button.style.color = 'white';
  button.style.padding = '6px 12px';
  button.style.fontSize = '14px';
  button.style.fontWeight = '600';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.margin = '5px';
  button.style.cursor = 'pointer';
  button.style.transition = 'background-color 0.2s';
  
  // Add a hover effect to indicate interactivity
  button.addEventListener('mouseover', () => {
    button.style.backgroundColor = '#3a3a3a';
  });

  button.addEventListener('mouseout', () => {
    button.style.backgroundColor = '#4a4a4a';
  });

  return button;
}

function createProgress() {
  const progressContainer = document.createElement('div');
  progressContainer.style.width = '99%';
  progressContainer.style.height = '10px';
  progressContainer.style.backgroundColor = '#e0e0e0';
  progressContainer.style.borderRadius = '4px';

  const progressBar = document.createElement('div');
  progressBar.style.width = '0%';
  progressBar.style.height = '100%';
  progressBar.style.backgroundColor = '#4a4a4a';
  progressBar.style.borderRadius = 'inherit';
  progressBar.style.transition = 'width 0.3s';

  progressContainer.appendChild(progressBar);
  return { progressContainer, progressBar };
}

function insertElements(button, progressContainer) {
  const targetElement = document.querySelector(
    '.flex.flex-col.w-full.py-2.flex-grow.md\\:py-3.md\\:pl-4'
  );
  targetElement.parentNode.insertBefore(button, targetElement);
  targetElement.parentNode.insertBefore(progressContainer, targetElement);
}

async function submitConversation(text, part, filename) {
  const textarea = document.querySelector("textarea[tabindex='0']");
  const enterKeyEvent = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    keyCode: 13,
  });
  textarea.value = `Part ${part} of ${filename}: \n\n ${text}`;
  textarea.dispatchEvent(enterKeyEvent);
}

if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    chrome.runtime.getURL('pdf.worker.min.js');
}

async function handleButtonClick(e) {
  e.preventDefault();

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.txt,.js,.py,.html,.css,.json,.csv,.doc,.docx,.pdf';

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    if (file.name.endsWith('.doc') || file.name.endsWith('.docx')) {
      reader.onload = async function (e) {
        const arrayBuffer = e.target.result;
        const { value: text } = await mammoth.extractRawText({ arrayBuffer });

        await processFileContent(text, file.name);
      };
      reader.readAsArrayBuffer(file);
    } else if (file.name.endsWith('.pdf')) {
      reader.onload = async function (e) {
        const arrayBuffer = e.target.result;
        const pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer })
          .promise;
        let text = '';

        for (let i = 1; i <= pdfDocument.numPages; i++) {
          const page = await pdfDocument.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item) => item.str).join(' ') + '\n';
        }

        await processFileContent(text, file.name);
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = async function (e) {
        const text = e.target.result;
        await processFileContent(text, file.name);
      };
      reader.readAsText(file);
    }
  });

  input.click();
}

async function processFileContent(text, filename) {
  const chunkSize = 15000;
  const numChunks = Math.ceil(text.length / chunkSize);

  for (let i = 0; i < numChunks; i++) {
    const chunk = text.slice(i * chunkSize, (i + 1) * chunkSize);
    await submitConversation(chunk, i + 1, filename);
    progressBar.style.width = `${((i + 1) / numChunks) * 100}%`;

    let chatgptReady = false;
    while (!chatgptReady) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      chatgptReady = !document.querySelector(
        '.text-2xl > span:not(.invisible)'
      );
    }
  }
  progressBar.style.backgroundColor = '#32CD32';
}

const { progressContainer, progressBar } = createProgress();
const button = createButton();
insertElements(button, progressContainer);
button.addEventListener('click', handleButtonClick);
