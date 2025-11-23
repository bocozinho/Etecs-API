const express = require('express');
const app = express();
const PORT = 3000;

const etecs = require('./etecs.json');

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

// Listar todas as ETECs
app.get('/etecs', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(etecsFormatadas, null, 2));
});

// Listar todos os cursos únicos
app.get('/cursos', (req, res) => {
  const cursosSet = new Set();
  etecsFormatadas.forEach(etec => {
    etec.cursos.forEach(c => cursosSet.add(c.nome));
  });
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify([...cursosSet], null, 2));
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

  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(resultados, null, 2));
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

  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(resultados, null, 2));
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

  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(resultados, null, 2));
});

// Inicia servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

