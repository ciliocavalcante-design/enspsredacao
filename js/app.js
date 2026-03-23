// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚙️ CONFIGURAÇÕES — proxy seguro via Cloudflare Worker
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// O token do GitHub fica guardado no Cloudflare (nunca exposto aqui)
const PROXY_URL = 'https://ensps-proxy.ciliocavalcante.workers.dev/proxy';
const GITHUB_PASTA = 'correcoes';

// Variáveis globais
let redacaoAtual = null;
let drawing = false;
let currentTool = 'pen';
let currentColor = '#FF0000';
let zoomLevel = 1;
let nomeProfessor = localStorage.getItem('nomeProfessor') || '';

// Canvas de desenho separado
let canvasDesenho = null;
let ctxDesenho = null;

let isPanning = false;
let panStart = { x: 0, y: 0 };
let scrollStart = { left: 0, top: 0 };

// Elementos DOM
const seletorRedacao = document.getElementById('seletorRedacao');
const btnCarregar = document.getElementById('btnCarregar');
const areaCorrecao = document.getElementById('areaCorrecao');
const nomeAluno = document.getElementById('nomeAluno');
const temaRedacao = document.getElementById('temaRedacao');
const btnSalvarCorrecao = document.getElementById('btnSalvarCorrecao');
const comentarios = document.getElementById('comentarios');
const notaFinal = document.getElementById('notaFinal');

// Elementos de desenho
const imagemRedacao = document.getElementById('imagemRedacao');
const canvasRedacao = document.getElementById('canvasRedacao');
const ctx = canvasRedacao.getContext('2d', { willReadFrequently: true });
const btnCaneta = document.getElementById('btnCaneta');
const btnMarcador = document.getElementById('btnMarcador');
const btnBorracha = document.getElementById('btnBorracha');
const btnMao = document.getElementById('btnMao');         // ← adicionado aqui
const corCaneta = document.getElementById('corCaneta');
const btnLimparDesenho = document.getElementById('btnLimparDesenho');
const containerImagem = document.querySelector('.container-imagem');



// Adicionar um wrapper para o zoom (será criado e preenchido no DOMContentLoaded)
let zoomWrapper = null;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    // Cria o zoomWrapper e move imagem/canvas para dentro dele
    zoomWrapper = document.createElement('div');
    zoomWrapper.className = 'zoom-wrapper'; // Adiciona a classe para o CSS
    containerImagem.appendChild(zoomWrapper);
    zoomWrapper.appendChild(imagemRedacao);
    zoomWrapper.appendChild(canvasRedacao);

    carregarListaRedacoes();
    configurarEventos();
    configurarZoom();
    criarCanvasDesenho();
    verificarNomeProfessor();
    criarModalHistorico();

    // Botão do header — sempre visível
    const btnHistoricoHeader = document.getElementById('btnVerHistoricoHeader');
    if (btnHistoricoHeader) {
        btnHistoricoHeader.addEventListener('click', abrirModalHistorico);
    }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📤 SALVAR ARQUIVO NO GITHUB
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function salvarNoGithub(nomeArquivo, conteudo, mensagemCommit) {
    try {
        const proxyPath = `${PROXY_URL}/${GITHUB_PASTA}/${nomeArquivo}`;
        console.log('📤 Tentando salvar via proxy:', proxyPath);

        // Verifica se o arquivo já existe para pegar o SHA
        let sha = null;
        const verificacao = await fetch(proxyPath);
        console.log('🔍 Status da verificação:', verificacao.status);

        if (verificacao.ok) {
            const dadosExistentes = await verificacao.json();
            sha = dadosExistentes.sha;
            console.log('📄 Arquivo já existe, SHA:', sha);
        }

        const conteudoBase64 = btoa(unescape(encodeURIComponent(conteudo)));

        const body = {
            message: mensagemCommit,
            content: conteudoBase64,
            branch: 'main'
        };

        if (sha) body.sha = sha;

        const resposta = await fetch(proxyPath, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        console.log('📬 Status do envio:', resposta.status);

        if (resposta.ok) {
            console.log(`✅ Arquivo salvo no GitHub via proxy: ${GITHUB_PASTA}/${nomeArquivo}`);
            return true;
        } else {
            const erro = await resposta.json();
            console.error('❌ Erro ao salvar:', erro.message);
            return false;
        }

    } catch (err) {
        console.error('❌ Erro na comunicação com o proxy:', err);
        return false;
    }
}

// 👨‍🏫 Verificar e solicitar nome do professor
function verificarNomeProfessor() {
    if (!nomeProfessor) {
        const nome = prompt('👨‍🏫 Por favor, digite seu nome (Professor):');
        if (nome && nome.trim()) {
            nomeProfessor = nome.trim();
            localStorage.setItem('nomeProfessor', nomeProfessor);
        }
    }
    atualizarNomeProfessor();
}

function atualizarNomeProfessor() {
    const displayProfessor = document.getElementById('nomeProfessor');
    if (displayProfessor && nomeProfessor) {
        displayProfessor.textContent = nomeProfessor;
    }
}

function criarCanvasDesenho() {
    canvasDesenho = document.createElement('canvas');
    ctxDesenho = canvasDesenho.getContext('2d', { willReadFrequently: true });
}

function carregarListaRedacoes() {
    while (seletorRedacao.options.length > 1) {
        seletorRedacao.remove(1);
    }

    const optionUpload = document.createElement('option');
    optionUpload.value = 'upload';
    optionUpload.textContent = '📤 Carregar Nova Redação...';
    seletorRedacao.appendChild(optionUpload);

    redacoes.forEach(redacao => {
        const option = document.createElement('option');
        option.value = redacao.id;
        option.textContent = `${redacao.aluno} - ${redacao.tema}`;
        seletorRedacao.appendChild(option);
    });
}

function configurarEventos() {
    btnCarregar.addEventListener('click', carregarRedacao);
    btnSalvarCorrecao.addEventListener('click', salvarCorrecao);

    btnCaneta.addEventListener('click', () => setTool('pen'));
    btnMarcador.addEventListener('click', () => setTool('marker'));
    btnBorracha.addEventListener('click', () => setTool('eraser'));

    // 🖐️ Botão mãozinha
    if (btnMao) btnMao.addEventListener('click', () => setTool('hand'));

    corCaneta.addEventListener('change', (e) => {
        currentColor = e.target.value;
    });
    btnLimparDesenho.addEventListener('click', limparDesenho);

    canvasRedacao.addEventListener('mousedown', startDrawing);
    canvasRedacao.addEventListener('mousemove', draw);
    canvasRedacao.addEventListener('mouseup', stopDrawing);
    canvasRedacao.addEventListener('mouseout', stopDrawing);

    canvasRedacao.addEventListener('touchstart', handleTouchStart);
    canvasRedacao.addEventListener('touchmove', handleTouchMove);
    canvasRedacao.addEventListener('touchend', stopDrawing);

    document.querySelectorAll('.nota-competencia').forEach(select => {
        select.addEventListener('change', calcularNotaFinal);
    });

    const btnAlterarProfessor = document.getElementById('btnAlterarProfessor');
    if (btnAlterarProfessor) {
        btnAlterarProfessor.addEventListener('click', () => {
            const novoNome = prompt('👨‍🏫 Digite o novo nome do professor:', nomeProfessor);
            if (novoNome && novoNome.trim()) {
                nomeProfessor = novoNome.trim();
                localStorage.setItem('nomeProfessor', nomeProfessor);
                atualizarNomeProfessor();
            }
        });
    }

    const btnVerHistorico = document.getElementById('btnVerHistorico');
    const btnExportarExcel = document.getElementById('btnExportarExcel');
    const btnExportarPDF = document.getElementById('btnExportarPDF');

    if (btnVerHistorico) btnVerHistorico.addEventListener('click', abrirModalHistorico);
    if (btnExportarExcel) btnExportarExcel.addEventListener('click', exportarExcel);
    if (btnExportarPDF) btnExportarPDF.addEventListener('click', exportarTabelaPDF);
}

// 🔍 Zoom apenas com botões
function configurarZoom() {
    const btnZoomIn = document.getElementById('btnZoomIn');
    const btnZoomOut = document.getElementById('btnZoomOut');
    const btnZoomReset = document.getElementById('btnZoomReset');

    if (btnZoomIn) btnZoomIn.addEventListener('click', () => {
        zoomLevel = Math.min(2.5, zoomLevel + 0.1);
        aplicarZoom();
        atualizarDisplayZoom();
    });

    if (btnZoomOut) btnZoomOut.addEventListener('click', () => {
        zoomLevel = Math.max(0.5, zoomLevel - 0.1);
        aplicarZoom();
        atualizarDisplayZoom();
    });

    if (btnZoomReset) btnZoomReset.addEventListener('click', () => {
        zoomLevel = 1;
        aplicarZoom();
        atualizarDisplayZoom();
    });
}

function atualizarDisplayZoom() {
    const zoomDisplay = document.getElementById('zoomDisplay');
    if (zoomDisplay) {
        const percentual = Math.round(zoomLevel * 100);
        zoomDisplay.textContent = `${percentual}%`;
    }
}

function aplicarZoom() {
    // Aplica a transformação de escala no wrapper
    if (zoomWrapper) {
        zoomWrapper.style.transform = `scale(${zoomLevel})`;
        // Ajusta o scroll do container-imagem para que o zoom seja visível
        // O overflow:auto no .zoom-wrapper já deve lidar com isso
    }
}

function carregarRedacao() {
    const valor = seletorRedacao.value;

    if (!valor) {
        alert('⚠️ Selecione uma redação primeiro!');
        return;
    }

    if (valor === 'upload') {
        carregarNovaRedacao();
        return;
    }

    const id = parseInt(valor);
    redacaoAtual = redacoes.find(r => r.id === id);

    nomeAluno.textContent = redacaoAtual.aluno;
    temaRedacao.textContent = redacaoAtual.tema;

    carregarImagem(`images/${redacaoAtual.imagem}`);
    resetarAvaliacao();
}

function carregarNovaRedacao() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const nomeAlunoInput = prompt('📝 Digite o nome do aluno:');
        if (!nomeAlunoInput) return;

        const tema = prompt('📋 Digite o tema da redação:');
        if (!tema) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            redacaoAtual = {
                id: Date.now(),
                aluno: nomeAlunoInput,
                tema: tema,
                imagem: file.name,
                data: new Date().toLocaleDateString('pt-BR'),
                imagemData: event.target.result
            };

            nomeAluno.textContent = nomeAlunoInput;
            temaRedacao.textContent = tema;

            carregarImagem(event.target.result);
            resetarAvaliacao();
        };
        reader.readAsDataURL(file);
    };

    input.click();
}

function carregarImagem(src) {
    // ESSA É A LINHA CRÍTICA PARA O PDF E PARA O CORS EM AMBIENTES ONLINE
    imagemRedacao.crossOrigin = 'Anonymous'; // Adicionado para evitar "Tainted Canvas"

    imagemRedacao.src = src;

    imagemRedacao.onload = function() {
        // Redefine as dimensões do canvas para as dimensões naturais da imagem
        // Isso é importante para a proporção do desenho
        canvasRedacao.width = imagemRedacao.naturalWidth;
        canvasRedacao.height = imagemRedacao.naturalHeight;

        canvasDesenho.width = imagemRedacao.naturalWidth;
        canvasDesenho.height = imagemRedacao.naturalHeight;
        ctxDesenho.clearRect(0, 0, canvasDesenho.width, canvasDesenho.height);

        zoomLevel = 1; // Reseta o zoom ao carregar nova imagem
        aplicarZoom();
        atualizarDisplayZoom();

        redesenharCanvas();
        areaCorrecao.style.display = 'grid';

        // Ajusta a altura do container-imagem para a proporção da imagem
        // Isso é importante para o object-fit: contain funcionar bem
        const aspectRatio = imagemRedacao.naturalHeight / imagemRedacao.naturalWidth;
        containerImagem.style.paddingBottom = `${aspectRatio * 100}%`;
    };

    imagemRedacao.onerror = function() {
        alert('❌ Erro ao carregar a imagem.');
        console.error(`Falha ao carregar imagem: ${src}`);
    };
}

function resetarAvaliacao() {
    document.querySelectorAll('.nota-competencia').forEach(select => {
        select.value = '0';
    });
    comentarios.value = '';
    calcularNotaFinal();
}



function setTool(tool) {
    // Se clicar na ferramenta já ativa, desmarca
    if (currentTool === tool) {
        currentTool = null;
        btnCaneta.classList.remove('active');
        btnMarcador.classList.remove('active');
        btnBorracha.classList.remove('active');
        if (btnMao) btnMao.classList.remove('active');
        canvasRedacao.style.cursor = 'default';
        return;
    }

    currentTool = tool;
    btnCaneta.classList.toggle('active', tool === 'pen');
    btnMarcador.classList.toggle('active', tool === 'marker');
    btnBorracha.classList.toggle('active', tool === 'eraser');
    if (btnMao) btnMao.classList.toggle('active', tool === 'hand');

    if (tool === 'marker') {
        currentColor = '#FFFF00';
        corCaneta.value = currentColor;
        canvasRedacao.style.cursor = 'crosshair';
    } else if (tool === 'pen') {
        currentColor = '#FF0000';
        corCaneta.value = currentColor;
        canvasRedacao.style.cursor = 'crosshair';
    } else if (tool === 'eraser') {
        canvasRedacao.style.cursor = 'cell';
    } else if (tool === 'hand') {
        canvasRedacao.style.cursor = 'grab';
    }
}

// A função getCanvasCoordinates precisa ser ajustada para levar em conta o zoom
function getCanvasCoordinates(e) {
    const rect = canvasRedacao.getBoundingClientRect();
    const scaleX = canvasRedacao.width / rect.width;
    const scaleY = canvasRedacao.height / rect.height;

    // Ajusta as coordenadas do mouse pelo zoomLevel
    const x = (e.clientX - rect.left) * scaleX / zoomLevel;
    const y = (e.clientY - rect.top) * scaleY / zoomLevel;

    return { x, y };
}

function startDrawing(e) {
    if (currentTool === 'hand') {
        isPanning = true;
        panStart = { x: e.clientX, y: e.clientY };
        scrollStart = {
            left: containerImagem.scrollLeft,
            top: containerImagem.scrollTop
        };
        canvasRedacao.style.cursor = 'grabbing';
        return;
    }
    if (!currentTool) return;

    drawing = true;
    const { x, y } = getCanvasCoordinates(e);
    ctxDesenho.beginPath();
    ctxDesenho.moveTo(x, y);
}

function draw(e) {
    if (currentTool === 'hand' && isPanning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        containerImagem.scrollLeft = scrollStart.left - dx;
        containerImagem.scrollTop = scrollStart.top - dy;
        return;
    }
    if (!drawing || !currentTool) return;

    const { x, y } = getCanvasCoordinates(e);

    ctxDesenho.lineCap = 'round';
    ctxDesenho.lineJoin = 'round';

    if (currentTool === 'eraser') {
        ctxDesenho.globalCompositeOperation = 'destination-out';
        ctxDesenho.lineWidth = 30;
        ctxDesenho.globalAlpha = 1.0;
    } else if (currentTool === 'marker') {
        ctxDesenho.globalCompositeOperation = 'source-over';
        ctxDesenho.globalAlpha = 0.3;
        ctxDesenho.lineWidth = 20;
        ctxDesenho.strokeStyle = currentColor;
    } else {
        ctxDesenho.globalCompositeOperation = 'source-over';
        ctxDesenho.globalAlpha = 1.0;
        ctxDesenho.lineWidth = 3;
        ctxDesenho.strokeStyle = currentColor;
    }

    ctxDesenho.lineTo(x, y);
    ctxDesenho.stroke();
    ctxDesenho.beginPath();
    ctxDesenho.moveTo(x, y);

    redesenharCanvas();
}

function stopDrawing() {
    if (isPanning) {
        isPanning = false;
        canvasRedacao.style.cursor = 'grab';
        return;
    }
    if (drawing) {
        drawing = false;
        ctxDesenho.beginPath();
        ctxDesenho.globalAlpha = 1.0;
    }
}

function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvasRedacao.dispatchEvent(mouseEvent);
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvasRedacao.dispatchEvent(mouseEvent);
}

function redesenharCanvas() {
    ctx.clearRect(0, 0, canvasRedacao.width, canvasRedacao.height);
    ctx.drawImage(imagemRedacao, 0, 0);
    ctx.drawImage(canvasDesenho, 0, 0);
}

function limparDesenho() {
    if (confirm('🗑️ Deseja limpar todas as marcações?')) {
        ctxDesenho.clearRect(0, 0, canvasDesenho.width, canvasDesenho.height);
        redesenharCanvas();
    }
}

function calcularNotaFinal() {
    let total = 0;
    document.querySelectorAll('.nota-competencia').forEach(select => {
        total += parseInt(select.value);
    });
    notaFinal.textContent = total;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💾 SISTEMA DE SALVAMENTO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function salvarCorrecao() {
    if (!redacaoAtual) {
        alert('⚠️ Carregue uma redação primeiro!');
        return;
    }

    if (!nomeProfessor) {
        verificarNomeProfessor();
        if (!nomeProfessor) return;
    }

    const notas = {};
    document.querySelectorAll('.nota-competencia').forEach(select => {
        const comp = select.dataset.competencia;
        notas[`competencia${comp}`] = parseInt(select.value);
    });

    const correcao = {
        id: `corr_${Date.now()}`,
        redacaoId: redacaoAtual.id,
        aluno: redacaoAtual.aluno,
        tema: redacaoAtual.tema,
        professor: nomeProfessor,
        notas: notas,
        notaFinal: parseInt(notaFinal.textContent),
        comentarios: comentarios.value,
        data: new Date().toLocaleString('pt-BR'),
        timestamp: Date.now()
    };

    // Salvar no localStorage
    const correcoes = JSON.parse(localStorage.getItem('correcoes') || '[]');
    correcoes.push(correcao);
    localStorage.setItem('correcoes', JSON.stringify(correcoes));

    // Salvar JSON (local + GitHub)
    await salvarArquivoJSON(correcao);

    // Gerar PDF
    gerarPDF(correcao);
}

// 💾 Salvar arquivo JSON individual
async function salvarArquivoJSON(correcao) {
    const nomeArquivo = `correcao_${correcao.aluno.replace(/\s/g, '_')}_${correcao.timestamp}.json`;
    const dataStr = JSON.stringify(correcao, null, 2);

    // Salva localmente (download)
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(url);

    // Salva no GitHub
    const mensagem = `Correção: ${correcao.aluno} - ${correcao.data}`;
    const salvouNoGithub = await salvarNoGithub(nomeArquivo, dataStr, mensagem);

    if (salvouNoGithub) {
        console.log(`✅ JSON salvo localmente e no GitHub: ${nomeArquivo}`);
    } else {
        console.warn(`⚠️ JSON salvo localmente, mas falhou no GitHub: ${nomeArquivo}`);
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 EXPORTAR EXCEL (XLSX)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function exportarExcel() {
    const correcoes = JSON.parse(localStorage.getItem('correcoes') || '[]');

    if (correcoes.length === 0) {
        alert('⚠️ Nenhuma correção encontrada para exportar!');
        return;
    }

    if (typeof XLSX === 'undefined') {
        alert('❌ Biblioteca XLSX não carregada. Verifique a conexão com a internet.');
        return;
    }

    const dados = correcoes.map((corr, index) => ({
        '#': index + 1,
        'Aluno': corr.aluno,
        'Tema': corr.tema,
        'Professor': corr.professor,
        'Data': corr.data,
        'Comp. 1': corr.notas.competencia1,
        'Comp. 2': corr.notas.competencia2,
        'Comp. 3': corr.notas.competencia3,
        'Comp. 4': corr.notas.competencia4,
        'Comp. 5': corr.notas.competencia5,
        'NOTA FINAL': corr.notaFinal,
        'Comentários': corr.comentarios || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dados);

    const colWidths = [
        { wch: 5 }, { wch: 25 }, { wch: 40 }, { wch: 20 }, { wch: 18 },
        { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 8 },
        { wch: 12 }, { wch: 50 }
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Correções ENEM');

    const nomeArquivo = `ENSPS_Notas_ENEM_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);

    alert(`✅ Planilha Excel exportada com ${correcoes.length} correções!`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📄 EXPORTAR TABELA EM PDF
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function exportarTabelaPDF() {
    const correcoes = JSON.parse(localStorage.getItem('correcoes') || '[]');

    if (correcoes.length === 0) {
        alert('⚠️ Nenhuma correção encontrada para exportar!');
        return;
    }

    if (typeof jspdf === 'undefined') {
        alert('❌ Biblioteca jsPDF não carregada. Verifique a conexão com a internet.');
        return;
    }

    const { jsPDF } = jspdf;
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    // Logo ENSPS
    const logoUrl = 'https://raw.githubusercontent.com/ciliocavalcante-design/ensps/main/LOGO%20ENSPS%202024.5.png';
    try {
        const logoImg = await carregarImagemPromise(logoUrl);
        pdf.addImage(logoImg, 'PNG', 15, 10, 20, 20);
    } catch (err) {
        console.warn('Logo não carregada:', err);
    }

    // Título
    pdf.setFontSize(18);
    pdf.setTextColor(102, 126, 234);
    pdf.text('ENSPS - Relatório de Correções ENEM', pageWidth / 2, 20, { align: 'center' });

    pdf.setFontSize(10);
    pdf.setTextColor(60, 60, 60);
    pdf.text(`Data de Exportação: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, 27, { align: 'center' });
    pdf.text(`Total de Correções: ${correcoes.length}`, pageWidth / 2, 32, { align: 'center' });

    pdf.setDrawColor(200, 200, 200);
    pdf.line(15, 35, pageWidth - 15, 35);

    // Cabeçalho da tabela
    let yPos = 45;
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'bold');
    pdf.setFillColor(102, 126, 234);
    pdf.setTextColor(255, 255, 255);

    const colunas = [
        { x: 15, w: 50, texto: 'Aluno' },
        { x: 68, w: 35, texto: 'Professor' },
        { x: 106, w: 28, texto: 'Data' },
        { x: 137, w: 12, texto: 'C1' },
        { x: 151, w: 12, texto: 'C2' },
        { x: 165, w: 12, texto: 'C3' },
        { x: 179, w: 12, texto: 'C4' },
        { x: 193, w: 12, texto: 'C5' },
        { x: 207, w: 20, texto: 'TOTAL' }
    ];

    pdf.rect(15, yPos - 5, pageWidth - 30, 8, 'F');
    colunas.forEach(col => {
        pdf.text(col.texto, col.x + 2, yPos);
    });

    yPos += 10;
    pdf.setFont(undefined, 'normal');
    pdf.setTextColor(0, 0, 0);

    // Dados
    correcoes.forEach((corr, index) => {
        if (yPos > pageHeight - 20) {
            pdf.addPage();
            yPos = 20;
        }

        if (index % 2 === 0) {
            pdf.setFillColor(250, 250, 250);
            pdf.rect(15, yPos - 5, pageWidth - 30, 8, 'F');
        }

        pdf.text(corr.aluno.substring(0, 30), 17, yPos);
        pdf.text(corr.professor.substring(0, 20), 70, yPos);
        pdf.text(corr.data, 108, yPos);
        pdf.text(corr.notas.competencia1.toString(), 140, yPos);
        pdf.text(corr.notas.competencia2.toString(), 154, yPos);
        pdf.text(corr.notas.competencia3.toString(), 168, yPos);
        pdf.text(corr.notas.competencia4.toString(), 182, yPos);
        pdf.text(corr.notas.competencia5.toString(), 196, yPos);

        pdf.setFont(undefined, 'bold');
        pdf.text(corr.notaFinal.toString(), 212, yPos);
        pdf.setFont(undefined, 'normal');

        yPos += 8;
    });

    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text('ENSPS - Sistema de Correção ENEM', pageWidth / 2, pageHeight - 10, { align: 'center' });

    const nomeArquivo = `ENSPS_Relatorio_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
    pdf.save(nomeArquivo);

    alert(`✅ Relatório PDF gerado com ${correcoes.length} correções!`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 MODAL DE HISTÓRICO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function criarModalHistorico() {
    const modal = document.createElement('div');
    modal.id = 'modalHistorico';
    modal.className = 'modal-historico';
    modal.innerHTML = `
        <div class="modal-conteudo">
            <div class="modal-header">
                <h2>📊 Histórico de Correções</h2>
                <button class="btn-fechar" onclick="fecharModalHistorico()">&times;</button>
            </div>
            <div id="conteudoHistorico"></div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            fecharModalHistorico();
        }
    });
}

async function abrirModalHistorico() {
    const modal = document.getElementById('modalHistorico');
    const conteudo = document.getElementById('conteudoHistorico');

    modal.style.display = 'block';
    conteudo.innerHTML = '<p style="text-align:center; color:#999; padding:40px;">⏳ Carregando correções do GitHub...</p>';

    try {
        const resposta = await fetch(`${PROXY_URL}/${GITHUB_PASTA}`);

        if (!resposta.ok) throw new Error('Erro ao acessar o GitHub');

        const arquivos = await resposta.json();
        const jsonFiles = arquivos.filter(f => f.name.endsWith('.json') && f.type === 'file');

        if (jsonFiles.length === 0) {
            conteudo.innerHTML = '<p style="text-align:center; color:#999; padding:40px;">Nenhuma correção salva ainda.</p>';
            return;
        }

        const correcoes = await Promise.all(
            jsonFiles.map(async (arquivo) => {
                const r = await fetch(arquivo.download_url + '?t=' + Date.now());
                return await r.json();
            })
        );

        correcoes.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        const media = Math.round(correcoes.reduce((acc, c) => acc + c.notaFinal, 0) / correcoes.length);

        let html = `
            <div style="display:flex; gap:15px; margin-bottom:15px; flex-wrap:wrap;">
                <div style="background:#667eea; color:white; padding:10px 20px; border-radius:10px;">
                    📝 <strong>${correcoes.length}</strong> correções
                </div>
                <div style="background:#48bb78; color:white; padding:10px 20px; border-radius:10px;">
                    📊 Média da turma: <strong>${media}/1000</strong>
                </div>
            </div>
            <table class="tabela-historico">
                <thead>
                    <tr>
                        <th>Aluno</th><th>Tema</th><th>Professor</th>
                        <th>C1</th><th>C2</th><th>C3</th><th>C4</th><th>C5</th>
                        <th>Nota Final</th><th>Data</th>
                    </tr>
                </thead>
                <tbody>
        `;

        correcoes.forEach((corr) => {
            const nota = corr.notaFinal;
            const cor = nota >= 800 ? '#48bb78' : nota >= 600 ? '#667eea' : nota >= 400 ? '#ed8936' : '#e53e3e';
            html += `
                <tr>
                    <td>${corr.aluno}</td>
                    <td>${corr.tema}</td>
                    <td>${corr.professor || '—'}</td>
                    <td>${corr.notas?.competencia1 ?? '—'}</td>
                    <td>${corr.notas?.competencia2 ?? '—'}</td>
                    <td>${corr.notas?.competencia3 ?? '—'}</td>
                    <td>${corr.notas?.competencia4 ?? '—'}</td>
                    <td>${corr.notas?.competencia5 ?? '—'}</td>
                    <td><strong style="color:${cor}">${nota}/1000</strong></td>
                    <td>${corr.data}</td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        conteudo.innerHTML = html;

    } catch (err) {
        console.error('Erro ao carregar histórico:', err);
        conteudo.innerHTML = '<p style="text-align:center; color:#e53e3e; padding:40px;">❌ Erro ao carregar correções do GitHub.</p>';
    }
}

function fecharModalHistorico() {
    const modal = document.getElementById('modalHistorico');
    modal.style.display = 'none';
}

function excluirCorrecao(index) {
    if (!confirm('⚠️ Deseja realmente excluir esta correção?')) {
        return;
    }

    const correcoes = JSON.parse(localStorage.getItem('correcoes') || '[]');
    correcoes.splice(index, 1);
    localStorage.setItem('correcoes', JSON.stringify(correcoes));

    alert('✅ Correção excluída com sucesso!');
    abrirModalHistorico();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📄 GERAR PDF DA CORREÇÃO INDIVIDUAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function gerarPDF(correcao) {
    try {
        if (typeof jspdf === 'undefined' || typeof html2canvas === 'undefined') {
            alert('⚠️ Bibliotecas não carregadas. Verifique a conexão com a internet.');
            return;
        }

        btnSalvarCorrecao.textContent = '⏳ Gerando PDF...';
        btnSalvarCorrecao.disabled = true;

        const { jsPDF } = jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        // Logo ENSPS
        const logoUrl = 'https://raw.githubusercontent.com/ciliocavalcante-design/ensps/main/LOGO%20ENSPS%202024.5.png';

        try {
            const logoImg = await carregarImagemPromise(logoUrl);
            pdf.addImage(logoImg, 'PNG', 15, 10, 20, 20);
        } catch (err) {
            console.warn('Logo não carregada:', err);
        }

        // Cabeçalho
        pdf.setFontSize(18);
        pdf.setTextColor(102, 126, 234);
        pdf.text('ENSPS - Correção ENEM', pageWidth / 2, 20, { align: 'center' });

        pdf.setFontSize(9);
        pdf.setTextColor(60, 60, 60);
        pdf.text(`Aluno: ${correcao.aluno}`, 20, 35);
        pdf.text(`Tema: ${correcao.tema}`, 20, 40);
        pdf.text(`Data: ${correcao.data}`, 20, 45);

        pdf.setDrawColor(200, 200, 200);
        pdf.line(20, 48, pageWidth - 20, 48);

        // Capturar canvas
        const canvas = await html2canvas(canvasRedacao, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        const margemLateral = 15;
        const espacoDisponivel = pageHeight - 55;
        const imgWidth = pageWidth - (margemLateral * 2);
        let imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (imgHeight > espacoDisponivel) {
            imgHeight = espacoDisponivel;
        }

        pdf.addImage(imgData, 'JPEG', margemLateral, 52, imgWidth, imgHeight);

        // Página 2: Avaliação
        pdf.addPage();

        pdf.setFontSize(16);
        pdf.setTextColor(102, 126, 234);
        pdf.text('Avaliação por Competências', 20, 25);

        let yPos = 38;
        pdf.setFontSize(11);
        pdf.setTextColor(0, 0, 0);

        const competencias = [
            { nome: 'Competência 1 - Domínio da norma padrão', nota: correcao.notas.competencia1 },
            { nome: 'Competência 2 - Compreensão do tema', nota: correcao.notas.competencia2 },
            { nome: 'Competência 3 - Argumentação', nota: correcao.notas.competencia3 },
            { nome: 'Competência 4 - Coesão textual', nota: correcao.notas.competencia4 },
            { nome: 'Competência 5 - Proposta de intervenção', nota: correcao.notas.competencia5 }
        ];

        pdf.setFillColor(240, 240, 240);
        pdf.rect(20, yPos - 5, pageWidth - 40, 8, 'F');
        pdf.setFont(undefined, 'bold');
        pdf.text('Competência', 25, yPos);
        pdf.text('Pontos', pageWidth - 40, yPos);

        yPos += 10;
        pdf.setFont(undefined, 'normal');

        competencias.forEach((comp, index) => {
            if (index % 2 === 0) {
                pdf.setFillColor(250, 250, 250);
                pdf.rect(20, yPos - 5, pageWidth - 40, 8, 'F');
            }
            pdf.text(comp.nome, 25, yPos);
            pdf.text(comp.nota.toString(), pageWidth - 40, yPos);
            yPos += 10;
        });

        pdf.setFillColor(102, 126, 234);
        pdf.rect(20, yPos - 5, pageWidth - 40, 10, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont(undefined, 'bold');
        pdf.setFontSize(12);

        pdf.text('NOTA FINAL', 25, yPos + 1.5);
        pdf.text(`${correcao.notaFinal} / 1000`, pageWidth - 40, yPos + 1.5, { align: 'right' });

        yPos += 20;

        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(12);
        pdf.text('Comentários do Professor', 20, yPos);

        yPos += 8;
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'normal');

        const comentarioTexto = correcao.comentarios || 'Nenhum comentário adicional.';
        const linhasComentario = pdf.splitTextToSize(comentarioTexto, pageWidth - 40);

        pdf.setFillColor(249, 249, 249);
        const alturaComentario = linhasComentario.length * 6 + 6;
        pdf.rect(20, yPos - 3, pageWidth - 40, alturaComentario, 'F');
        pdf.setDrawColor(102, 126, 234);
        pdf.setLineWidth(2);
        pdf.line(20, yPos - 3, 20, yPos - 3 + alturaComentario);

        pdf.text(linhasComentario, 25, yPos + 2);

        const nomeArquivo = `ENSPS_correcao_${correcao.aluno.replace(/\s/g, '_')}_${Date.now()}.pdf`;

        // Salva localmente
        pdf.save(nomeArquivo);

        // Envia para Google Drive via proxy
        btnSalvarCorrecao.textContent = '☁️ Enviando para o Drive...';
        try {
            const pdfBase64 = pdf.output('datauristring').split(',')[1];
            const driveResponse = await fetch('https://ensps-proxy.ciliocavalcante.workers.dev/upload-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: nomeArquivo, fileBase64: pdfBase64 })
            });
            const driveResult = await driveResponse.json();
            if (driveResult.success) {
                console.log('✅ PDF enviado para o Google Drive:', driveResult.fileId);
                alert('✅ Tudo salvo com sucesso!\n📋 JSON salvo no GitHub\n📄 PDF salvo no Drive e no seu computador 🎉');
            } else {
                console.error('❌ Erro no Drive:', driveResult.error);
                alert('✅ PDF gerado e baixado!\n⚠️ Mas não foi possível salvar no Google Drive.');
            }
        } catch (driveErr) {
            console.error('❌ Erro ao enviar para o Drive:', driveErr);
            alert('✅ PDF gerado e baixado!\n⚠️ Mas não foi possível salvar no Google Drive.');
        }

        btnSalvarCorrecao.textContent = '💾 Salvar Correção e Gerar PDF';
        btnSalvarCorrecao.disabled = false;

    } catch (err) {
        console.error('Erro ao gerar PDF:', err);
        alert('❌ Erro ao gerar PDF: ' + err.message);

        btnSalvarCorrecao.textContent = '💾 Salvar Correção e Gerar PDF';
        btnSalvarCorrecao.disabled = false;
    }
}

function carregarImagemPromise(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}
