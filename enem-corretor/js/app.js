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
const corCaneta = document.getElementById('corCaneta');
const btnLimparDesenho = document.getElementById('btnLimparDesenho');
const containerImagem = document.querySelector('.container-imagem');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    carregarListaRedacoes();
    configurarEventos();
    configurarZoom();
    criarCanvasDesenho();
    verificarNomeProfessor();
    criarModalHistorico();
});

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

    // Botão para alterar nome do professor
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

    // 🆕 NOVOS BOTÕES
    const btnVerHistorico = document.getElementById('btnVerHistorico');
    const btnExportarExcel = document.getElementById('btnExportarExcel');
    const btnExportarPDF = document.getElementById('btnExportarPDF');

    if (btnVerHistorico) {
        btnVerHistorico.addEventListener('click', abrirModalHistorico);
    }

    if (btnExportarExcel) {
        btnExportarExcel.addEventListener('click', exportarExcel);
    }

    if (btnExportarPDF) {
        btnExportarPDF.addEventListener('click', exportarTabelaPDF);
    }
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
    const width = imagemRedacao.naturalWidth * zoomLevel;
    const height = imagemRedacao.naturalHeight * zoomLevel;

    imagemRedacao.style.width = width + 'px';
    imagemRedacao.style.height = height + 'px';

    canvasRedacao.style.width = width + 'px';
    canvasRedacao.style.height = height + 'px';

    canvasRedacao.width = imagemRedacao.naturalWidth;
    canvasRedacao.height = imagemRedacao.naturalHeight;

    redesenharCanvas();
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
    imagemRedacao.src = src;

    imagemRedacao.onload = function() {
        canvasRedacao.width = imagemRedacao.naturalWidth;
        canvasRedacao.height = imagemRedacao.naturalHeight;

        canvasDesenho.width = imagemRedacao.naturalWidth;
        canvasDesenho.height = imagemRedacao.naturalHeight;
        ctxDesenho.clearRect(0, 0, canvasDesenho.width, canvasDesenho.height);

        zoomLevel = 1;
        aplicarZoom();
        atualizarDisplayZoom();

        redesenharCanvas();
        areaCorrecao.style.display = 'grid';
    };

    imagemRedacao.onerror = function() {
        alert('❌ Erro ao carregar a imagem.');
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
    currentTool = tool;
    btnCaneta.classList.toggle('active', tool === 'pen');
    btnMarcador.classList.toggle('active', tool === 'marker');
    btnBorracha.classList.toggle('active', tool === 'eraser');

    if (tool === 'marker') {
        currentColor = '#FFFF00';
        corCaneta.value = currentColor;
    } else if (tool === 'pen') {
        currentColor = '#FF0000';
        corCaneta.value = currentColor;
    }
}

function getCanvasCoordinates(e) {
    const rect = canvasRedacao.getBoundingClientRect();
    const scaleX = canvasRedacao.width / rect.width;
    const scaleY = canvasRedacao.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    return { x, y };
}

function startDrawing(e) {
    drawing = true;
    const { x, y } = getCanvasCoordinates(e);

    ctxDesenho.beginPath();
    ctxDesenho.moveTo(x, y);
}

function draw(e) {
    if (!drawing) return;

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

function salvarCorrecao() {
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

    // 💾 Salvar arquivo JSON individual
    salvarArquivoJSON(correcao);

    // Gerar PDF
    gerarPDF(correcao);
}

// 💾 Salvar arquivo JSON individual
function salvarArquivoJSON(correcao) {
    const nomeArquivo = `correcao_${correcao.aluno.replace(/\s/g, '_')}_${correcao.timestamp}.json`;
    const dataStr = JSON.stringify(correcao, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    link.click();

    URL.revokeObjectURL(url);
    console.log(`✅ Arquivo JSON salvo: ${nomeArquivo}`);
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

function abrirModalHistorico() {
    const correcoes = JSON.parse(localStorage.getItem('correcoes') || '[]');
    const modal = document.getElementById('modalHistorico');
    const conteudo = document.getElementById('conteudoHistorico');

    if (correcoes.length === 0) {
        conteudo.innerHTML = '<p style="text-align:center; color:#999; padding:40px;">Nenhuma correção salva ainda.</p>';
    } else {
        let html = `
            <table class="tabela-historico">
                <thead>
                    <tr>
                        <th>Aluno</th>
                        <th>Tema</th>
                        <th>Professor</th>
                        <th>Nota Final</th>
                        <th>Data</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;

        correcoes.forEach((corr, index) => {
            html += `
                <tr>
                    <td>${corr.aluno}</td>
                    <td>${corr.tema}</td>
                    <td>${corr.professor}</td>
                    <td><strong>${corr.notaFinal}/1000</strong></td>
                    <td>${corr.data}</td>
                    <td>
                        <button class="btn-excluir" onclick="excluirCorrecao(${index})">
                            🗑️ Excluir
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        conteudo.innerHTML = html;
    }

    modal.style.display = 'block';
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
        pdf.save(nomeArquivo);

        btnSalvarCorrecao.textContent = '💾 Salvar Correção e Gerar PDF';
        btnSalvarCorrecao.disabled = false;

        alert('✅ Correção salva, JSON e PDF gerados com sucesso!');

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
