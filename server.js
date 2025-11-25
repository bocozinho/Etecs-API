const express = require('express');
const app = express();
const PORT = 3000;

const etecs = require('./etecs.json');

// 🔥 ADICIONAR CORS - ESSENCIAL PARA O FRONT-END FUNCIONAR
const cors = require('cors');
app.use(cors()); // Habilita CORS para todas as rotas

app.use(express.json());

// Normaliza textos (remove acentos, espaços extras, deixa lowercase)
function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Formata ETEC para saída limpa
function formatarEtec(etec) {
  return {
    name: etec.name,
    id: etec.id,
    link: etec.link,
    endereco: etec.endereco,
    cep: etec.cep,
    cidade: etec.cidade,
    estado: etec.estado,
    telefone: etec.telefone,
    email: etec.email,
    site: etec.site,
    totalCursos: etec.cursos ? etec.cursos.length : 0,
    cursos: etec.cursos ? etec.cursos.map(c => ({
      nome: c.nome,
      link: c.link,
      periodo: c.periodo,
      vagas: c.vagas
    })) : []
  };
}

const etecsFormatadas = etecs.map(formatarEtec);

app.get('/', (req, res) => {
  res.send('Servidor de API ETECs rodando. Use /etecs, /cursos ou /busca para filtrar.');
});

// Lista todos os dados
app.get('/all', (req, res) => {
  res.json(etecsFormatadas); // Usar res.json() em vez de res.send()
});

// Listar todas as ETECs
app.get('/etecs', (req, res) => {
  // Retornar apenas os nomes das ETECs como especificado na documentação
  const nomesEtecs = etecsFormatadas.map(etec => etec.name);
  res.json(nomesEtecs);
});

// Lista todas as cidades que contém ETECs
app.get('/cidades', (req, res) => {
  const cidadesSet = new Set(); 
  etecsFormatadas.forEach(etec => {
    if (etec.cidade) {
      cidadesSet.add(etec.cidade);
    }
  });
  
  const cidadesUnicas = [...cidadesSet].sort();
  res.json(cidadesUnicas);
});

// Listar todos os cursos únicos
app.get('/cursos', (req, res) => {
  const cursosSet = new Set();
  etecsFormatadas.forEach(etec => {
    etec.cursos.forEach(c => cursosSet.add(c.nome));
  });
  res.json([...cursosSet]);
});

// Busca por cidade (substring)
app.get('/busca/cidade', (req, res) => {
  const { cidade } = req.query;
  if (!cidade) return res.status(400).json({ erro: 'Informe a cidade' });

  const cidadeFormatada = normalizarTexto(cidade);
  const resultados = etecsFormatadas.filter(etec =>
    etec.cidade && normalizarTexto(etec.cidade).includes(cidadeFormatada)
  );

  if (!resultados.length) {
    return res.status(404).json({ mensagem: 'Nenhuma ETEC encontrada para esta cidade.' });
  }

  res.json(resultados);
});

// Busca por curso (substring)
app.get('/busca/curso', (req, res) => {
  const { curso } = req.query;
  if (!curso) return res.status(400).json({ erro: 'Informe o curso' });

  const cursoFormatado = normalizarTexto(curso);
  const resultados = etecsFormatadas.filter(etec =>
    etec.cursos && etec.cursos.some(c => normalizarTexto(c.nome).includes(cursoFormatado))
  );

  if (!resultados.length) {
    return res.status(404).json({ mensagem: 'Nenhuma ETEC oferece este curso.' });
  }

  res.json(resultados);
});

// Busca por nome da ETEC (substring)
app.get('/busca/etec', (req, res) => {
  const { nome } = req.query;
  if (!nome) return res.status(400).json({ erro: 'Informe o nome da ETEC' });

  const nomeFormatado = normalizarTexto(nome);
  const resultados = etecsFormatadas.filter(etec =>
    etec.name && normalizarTexto(etec.name).includes(nomeFormatado)
  );

  if (!resultados.length) {
    return res.status(404).json({ mensagem: 'Nenhuma ETEC encontrada com esse nome.' });
  }

  res.json(resultados);
});

// Inicia servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
