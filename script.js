// Configure aqui as taxas da sua maquininha (em %).
const taxasMaquininha = [
    { parcelas: 1, taxa: 4.99 },
    { parcelas: 2, taxa: 6.50 },
    { parcelas: 3, taxa: 7.90 },
    { parcelas: 4, taxa: 9.20 },
    { parcelas: 5, taxa: 10.50 },
    { parcelas: 6, taxa: 11.80 },
    { parcelas: 7, taxa: 13.10 },
    { parcelas: 8, taxa: 14.40 },
    { parcelas: 9, taxa: 15.70 },
    { parcelas: 10, taxa: 17.00 },
    { parcelas: 11, taxa: 18.30 },
    { parcelas: 12, taxa: 19.60 }
];

const inputValor = document.getElementById('valorDesejado');
const inputParcelas = document.getElementById('quantidadeParcelas');
const inputNome = document.getElementById('nomeCliente');
const inputTelefone = document.getElementById('telefoneCliente');
const tabelaResultados = document.getElementById('tabelaResultados');
const emptyState = document.getElementById('emptyState');
const valorLabel = document.getElementById('valorLabel');
const valorHint = document.getElementById('valorHint');
const resultDescription = document.getElementById('resultDescription');
const liquidoHeader = document.getElementById('liquidoHeader');
const telefoneHint = document.getElementById('telefoneHint');
const selectedInstallmentValue = document.getElementById('selectedInstallmentValue');
const selectedConditionDetails = document.getElementById('selectedConditionDetails');
const modeButtons = document.querySelectorAll('.mode-button');
const toolsButton = document.getElementById('toolsButton');
const toolsDialog = document.getElementById('toolsDialog');
const closeToolsButton = document.getElementById('closeToolsButton');
const adminLoginForm = document.getElementById('adminLoginForm');
const adminPassword = document.getElementById('adminPassword');
const rateEditorForm = document.getElementById('rateEditorForm');
const rateFields = document.getElementById('rateFields');
const toolsFeedback = document.getElementById('toolsFeedback');
const adminLogoutButton = document.getElementById('adminLogoutButton');
const ADMIN_PASSWORD_HASH = '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92';
const STORAGE_KEY = 'calculadoraEmprestimoTaxas';
let modoCalculo = 'desired';
let resultados = [];
let erroCarregamentoTaxas = '';

function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function criarCelula(texto, classe) {
    const celula = document.createElement('td');
    celula.textContent = texto;
    if (classe) celula.className = classe;
    return celula;
}

function carregarTaxasSalvas() {
    try {
        const taxasSalvas = localStorage.getItem(STORAGE_KEY);
        if (!taxasSalvas) return;

        const taxas = JSON.parse(taxasSalvas);
        const validas = Array.isArray(taxas)
            && taxas.length === taxasMaquininha.length
            && taxas.every((item, index) => (
                item.parcelas === index + 1
                && Number.isFinite(item.taxa)
                && item.taxa >= 0
                && item.taxa < 100
            ));

        if (!validas) throw new Error('As taxas salvas não estão em um formato válido.');
        taxasMaquininha.forEach((item, index) => {
            item.taxa = taxas[index].taxa;
        });
    } catch (erro) {
        erroCarregamentoTaxas = 'Não foi possível carregar as taxas salvas. Os valores padrão estão sendo usados.';
        console.error('Erro ao carregar as taxas salvas:', erro);
    }
}

function mostrarTaxasParaEdicao() {
    rateFields.replaceChildren();
    taxasMaquininha.forEach(item => {
        const campo = document.createElement('div');
        campo.className = 'rate-field';

        const label = document.createElement('label');
        const inputId = `taxa-${item.parcelas}`;
        label.htmlFor = inputId;
        label.textContent = `${item.parcelas} parcela${item.parcelas > 1 ? 's' : ''}`;

        const inputWrap = document.createElement('div');
        inputWrap.className = 'rate-input-wrap';
        const input = document.createElement('input');
        input.id = inputId;
        input.type = 'number';
        input.min = '0';
        input.max = '99.99';
        input.step = '0.01';
        input.required = true;
        input.value = item.taxa.toFixed(2);
        input.dataset.parcelas = String(item.parcelas);

        const percent = document.createElement('span');
        percent.textContent = '%';
        inputWrap.append(input, percent);
        campo.append(label, inputWrap);
        rateFields.append(campo);
    });
}

async function gerarHashSenha(senha) {
    const resultado = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(senha));
    return Array.from(new Uint8Array(resultado), byte => byte.toString(16).padStart(2, '0')).join('');
}

function calcular() {
    const valor = Number(inputValor.value);
    const valorValido = Number.isFinite(valor) && valor > 0;
    tabelaResultados.replaceChildren();
    resultados = [];
    emptyState.hidden = valorValido;

    if (!valorValido) {
        selectedInstallmentValue.textContent = '—';
        selectedConditionDetails.textContent = '';
        return;
    }

    resultados = taxasMaquininha.map(item => {
        const fatorLiquido = 1 - (item.taxa / 100);
        const totalCartao = modoCalculo === 'desired' ? valor / fatorLiquido : valor;
        const valorLiquido = modoCalculo === 'desired' ? valor : valor * fatorLiquido;

        return {
            parcelas: item.parcelas,
            taxa: item.taxa,
            totalCartao,
            valorLiquido,
            valorParcela: totalCartao / item.parcelas
        };
    });

    const resultadoSelecionado = resultados.find(
        resultado => resultado.parcelas === Number(inputParcelas.value)
    );
    if (resultadoSelecionado) {
        selectedInstallmentValue.textContent =
            `${resultadoSelecionado.parcelas}x de ${formatarMoeda(resultadoSelecionado.valorParcela)}`;
        selectedConditionDetails.textContent =
            `Cliente recebe ${formatarMoeda(resultadoSelecionado.valorLiquido)} · Total no cartão ${formatarMoeda(resultadoSelecionado.totalCartao)}`;
    }

    resultados.forEach((resultado, index) => {
        const linha = document.createElement('tr');
        if (resultado.parcelas === Number(inputParcelas.value)) {
            linha.classList.add('selected-row');
        }
        linha.append(
            criarCelula(`${resultado.parcelas}x`),
            criarCelula(`${resultado.taxa.toFixed(2).replace('.', ',')}%`),
            criarCelula(formatarMoeda(resultado.valorParcela), 'destaque'),
            criarCelula(formatarMoeda(resultado.totalCartao)),
            criarCelula(formatarMoeda(resultado.valorLiquido), 'net-amount')
        );

        const acao = document.createElement('td');
        const botaoEnviar = document.createElement('button');
        botaoEnviar.type = 'button';
        botaoEnviar.className = 'share-button';
        botaoEnviar.dataset.index = String(index);
        botaoEnviar.textContent = 'Enviar';
        botaoEnviar.setAttribute('aria-label', `Enviar condição em ${resultado.parcelas} parcelas pelo WhatsApp`);
        acao.append(botaoEnviar);
        linha.append(acao);
        tabelaResultados.append(linha);
    });
}

function atualizarModo(modo) {
    modoCalculo = modo;
    modeButtons.forEach(botao => {
        const ativo = botao.dataset.mode === modoCalculo;
        botao.classList.toggle('active', ativo);
        botao.setAttribute('aria-pressed', String(ativo));
    });

    if (modoCalculo === 'limit') {
        valorLabel.textContent = 'Limite total disponível no cartão';
        valorHint.textContent = 'Informe o limite total que pode ser usado na operação.';
        inputValor.placeholder = '0,00';
        resultDescription.textContent = 'Veja quanto o cliente recebe líquido em cada prazo.';
        liquidoHeader.textContent = 'Cliente recebe';
    } else {
        valorLabel.textContent = 'Valor que o cliente quer receber';
        valorHint.textContent = 'Informe o valor líquido desejado pelo cliente.';
        inputValor.placeholder = '0,00';
        resultDescription.textContent = 'Compare o valor das parcelas em cada prazo.';
        liquidoHeader.textContent = 'Você recebe';
    }

    calcular();
}

function carregarOpcoesParcelas() {
    taxasMaquininha.forEach(item => {
        const opcao = document.createElement('option');
        opcao.value = String(item.parcelas);
        opcao.textContent = `${item.parcelas} parcela${item.parcelas > 1 ? 's' : ''}`;
        inputParcelas.append(opcao);
    });
}

function enviarCondicao(indice) {
    const telefone = inputTelefone.value.replace(/\D/g, '');
    if (telefone.length < 10 || telefone.length > 13) {
        telefoneHint.textContent = 'Informe um WhatsApp válido com DDD para compartilhar.';
        telefoneHint.style.color = '#c2413b';
        inputTelefone.focus();
        return;
    }

    telefoneHint.textContent = 'Selecione “Enviar” na condição que deseja compartilhar.';
    telefoneHint.style.color = '';
    const telefoneComPais = telefone.length <= 11 ? `55${telefone}` : telefone;
    const resultado = resultados[indice];
    if (!resultado) return;

    const nome = inputNome.value.trim();
    const saudacao = nome ? `Olá, ${nome}!` : 'Olá!';
    const tipoCalculo = modoCalculo === 'limit'
        ? 'Simulação calculada com base no limite informado do cartão.'
        : 'Simulação para o valor líquido solicitado.';
    const mensagem = [
        saudacao,
        '',
        'Confira esta opção de empréstimo:',
        `• Valor líquido: ${formatarMoeda(resultado.valorLiquido)}`,
        `• Parcelamento: ${resultado.parcelas}x de ${formatarMoeda(resultado.valorParcela)} (com juros)`,
        `• Total no cartão: ${formatarMoeda(resultado.totalCartao)}`,
        '',
        tipoCalculo,
        'Os valores são estimados e devem ser confirmados antes da contratação.'
    ].join('\n');

    const url = `https://wa.me/${telefoneComPais}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
}

inputValor.addEventListener('input', calcular);
inputParcelas.addEventListener('change', calcular);
inputTelefone.addEventListener('input', () => {
    telefoneHint.textContent = 'Selecione “Enviar” na condição que deseja compartilhar.';
    telefoneHint.style.color = '';
});

modeButtons.forEach(botao => {
    botao.addEventListener('click', () => atualizarModo(botao.dataset.mode));
});

tabelaResultados.addEventListener('click', evento => {
    const botao = evento.target.closest('.share-button');
    if (botao) enviarCondicao(Number(botao.dataset.index));
});

toolsButton.addEventListener('click', evento => {
    evento.preventDefault();
    adminLoginForm.hidden = false;
    rateEditorForm.hidden = true;
    adminPassword.value = '';
    toolsFeedback.textContent = '';
    toolsFeedback.classList.remove('success');
    toolsDialog.showModal();
    adminPassword.focus();
});

closeToolsButton.addEventListener('click', () => toolsDialog.close());
toolsDialog.addEventListener('click', evento => {
    if (evento.target === toolsDialog) toolsDialog.close();
});

adminLoginForm.addEventListener('submit', async evento => {
    evento.preventDefault();
    toolsFeedback.textContent = '';
    toolsFeedback.classList.remove('success');

    try {
        if (await gerarHashSenha(adminPassword.value) !== ADMIN_PASSWORD_HASH) {
            toolsFeedback.textContent = 'Senha incorreta.';
            adminPassword.focus();
            return;
        }

        mostrarTaxasParaEdicao();
        adminLoginForm.hidden = true;
        rateEditorForm.hidden = false;
        toolsFeedback.textContent = erroCarregamentoTaxas;
        rateFields.querySelector('input').focus();
    } catch (erro) {
        console.error('Erro ao validar a senha de administrador:', erro);
        toolsFeedback.textContent = 'Não foi possível validar a senha neste navegador.';
    }
});

rateEditorForm.addEventListener('submit', evento => {
    evento.preventDefault();
    toolsFeedback.classList.remove('success');
    const campos = Array.from(rateFields.querySelectorAll('input'));
    const taxasAtualizadas = campos.map(campo => ({
        parcelas: Number(campo.dataset.parcelas),
        taxa: Number(campo.value)
    }));
    const validas = campos.every(campo => campo.value.trim() !== '' && campo.checkValidity())
        && taxasAtualizadas.every(item => Number.isFinite(item.taxa) && item.taxa >= 0 && item.taxa < 100);

    if (!validas) {
        toolsFeedback.textContent = 'Informe taxas válidas entre 0% e 99,99%.';
        return;
    }

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(taxasAtualizadas));
        taxasMaquininha.forEach((item, index) => {
            item.taxa = taxasAtualizadas[index].taxa;
        });
        erroCarregamentoTaxas = '';
        calcular();
        toolsFeedback.textContent = 'Porcentagens salvas com sucesso neste navegador.';
        toolsFeedback.classList.add('success');
    } catch (erro) {
        console.error('Erro ao salvar as taxas:', erro);
        toolsFeedback.textContent = 'Não foi possível salvar as porcentagens neste navegador.';
    }
});

adminLogoutButton.addEventListener('click', () => {
    rateEditorForm.hidden = true;
    adminLoginForm.hidden = false;
    adminPassword.value = '';
    toolsFeedback.textContent = '';
    toolsFeedback.classList.remove('success');
    adminPassword.focus();
});

carregarTaxasSalvas();
carregarOpcoesParcelas();
calcular();
