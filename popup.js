document.getElementById('group-tabs').addEventListener('click', async () => {
  // Obtém todas as guias abertas no navegador
  const tabs = await chrome.tabs.query({});

  // Objeto para agrupar as guias por domínio
  const groups = {};

  // Itera pelas guias e organiza por domínio
  tabs.forEach(tab => {
      const url = new URL(tab.url); // Obtém a URL da guia
      const domain = url.hostname; // Extrai o domínio da URL

      // Inicializa um array para o domínio, caso ainda não exista
      if (!groups[domain]) {
          groups[domain] = [];
      }

      // Adiciona o ID da guia ao domínio correspondente
      groups[domain].push(tab.id);
  });

  // Cria grupos separados para cada domínio
  for (const domain in groups) {
      const tabIds = groups[domain]; // Obtém os IDs das guias do domínio atual

      try {
          // Cria um grupo com as guias do domínio atual
          const groupId = await chrome.tabs.group({ tabIds });

          // Atualiza o grupo com título e cor, se a API estiver disponível
          if (chrome.tabGroups && chrome.tabGroups.update) {
              await chrome.tabGroups.update(groupId, { title: domain, color: 'blue' });
          } else {
              console.warn("A API tabGroups não está disponível neste navegador.");
          }
      } catch (error) {
          console.error(`Erro ao criar ou atualizar o grupo para o domínio ${domain}:`, error);
      }
  }
});

// Verifica se a API de armazenamento local está funcionando
if (chrome.storage && chrome.storage.local) {
  chrome.storage.local.get(['urls'], (result) => {
      urls = result.urls || [];
      displayUrls();
  });
} else {
  console.error("A API chrome.storage.local não está disponível. Verifique o contexto da extensão.");
}

// Formulário de obtenção de URLs
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById('myForm');
  const apagarForm = document.getElementById('apagar');

  // Botão para abrir URLs em abas
  const abrirUrlsButton = document.createElement('button');
  abrirUrlsButton.textContent = 'Abrir URLs em Abas';
  abrirUrlsButton.classList.add('open-tabs-button'); // Adiciona uma classe ao botão
  document.body.appendChild(abrirUrlsButton);

  let urls = [];

  // Recuperar URLs salvas no armazenamento local
  chrome.storage.local.get(['urls'], (result) => {
      urls = result.urls || [];
      displayUrls();
  });

  // Exibir URLs salvas na interface
  const displayUrls = () => {
      const ul = document.getElementById('tab-list');
      ul.innerHTML = '';
      urls.forEach((url) => {
          const li = document.createElement('li');
          li.textContent = url;
          ul.appendChild(li);
      });
  };

  // Adicionar nova URL ao vetor e salvar
  form.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = document.getElementById('fname').value;

      if (input.startsWith('http://') || input.startsWith('https://')) {
          urls.push(input);
          chrome.storage.local.set({ urls }, () => {
              console.log("URLs salvas:", urls);
              displayUrls(); // Atualiza a interface
          });
      } else {
          alert("Não é um link válido.");
      }

      document.getElementById('fname').value = '';
  });

  // Apagar o vetor e atualizar o display
  apagarForm.addEventListener('submit', (event) => {
      event.preventDefault();
      urls = []; // Limpa o vetor
      chrome.storage.local.set({ urls }, () => {
          console.log("URLs apagadas");
          displayUrls(); // Atualiza a interface para mostrar o vetor vazio
      });
  });

  // Botão para abrir URLs em abas e criar grupo
  abrirUrlsButton.addEventListener('click', async () => {
      if (urls.length === 0) {
          alert("Nenhuma URL salva para abrir.");
          return;
      }

      const tabIds = []; // Para armazenar os IDs das abas criadas

      for (const [index, url] of urls.entries()) {
          try {
              if (index === 0) {
                  // Atualizar a aba atual com a primeira URL
                  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                  const updatedTab = await chrome.tabs.update(activeTab.id, { url: url });
                  tabIds.push(updatedTab.id);
              } else {
                  // Para as outras URLs, abra novas abas
                  const newTab = await chrome.tabs.create({ url: url });
                  tabIds.push(newTab.id);
              }
          } catch (error) {
              console.error(`Erro ao abrir a URL: ${url}`, error);
          }
      }

      try {
          // Criar grupo para as abas abertas
          const groupId = await chrome.tabs.group({ tabIds });
          // Atualizar o grupo com nome e cor
          if (chrome.tabGroups && chrome.tabGroups.update) {
              await chrome.tabGroups.update(groupId, { title: 'Favoritos', color: 'yellow' });
          } else {
              console.warn("A API tabGroups não está disponível neste navegador.");
          }
      } catch (error) {
          console.error("Erro ao criar ou atualizar o grupo:", error);
      }
  });
});
