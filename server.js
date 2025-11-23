const express = require('express');
const app = express();
const PORT = 3000;
const etecs = require('./etecs.json');

app.use(express.json());

// Função pra normalizar textos (remove acentos, espaços extras e deixa tudo lowercase)
function normalizarTexto(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD') 
    .replace(/[\u0300-\u036f]/g, '') 
    .replace(/\s+/g, ' ') 
    .trim();
}

// Função que retorna os dados
async function buscarDadosEtecs() {
  return etecs;
}

// Rota raiz
app.get('/', (req, res) => {
  res.send('Servidor de API ETECs rodando. Use /etecs ou /etecs/cursos para filtrar.');
});

// Rota para todas as ETECs
app.get('/etecs', async (req, res) => {
  try {
    const dados = await buscarDadosEtecs();
    res.status(200).json(dados);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Falha ao buscar dados da API.' });
  }
});

// Rota filtrando por cidade e/ou curso
app.get('/etecs/cursos', async (req, res) => {
  try {
    const { cidade, curso } = req.query;
    let resultados = await buscarDadosEtecs();

    // Filtra por cidade
    if (cidade) {
      const cidadeFormatada = normalizarTexto(cidade);
      resultados = resultados.filter(etec => 
        etec.cidade && normalizarTexto(etec.cidade).includes(cidadeFormatada)
      );
    }

    // Filtra por curso
    if (curso) {
      const cursoFormatado = normalizarTexto(curso);
      resultados = resultados.filter(etec => 
        etec.cursos && etec.cursos.some(c => normalizarTexto(c.nome).includes(cursoFormatado))
      );
    }

    // Retorno
    if (resultados.length > 0) {
      res.status(200).json({
        filtros: { cidade: cidade || null, curso: curso || null },
        total_encontrado: resultados.length,
        dados: resultados
      });
    } else {
      res.status(404).json({
        filtros: { cidade: cidade || null, curso: curso || null },
        mensagem: 'Nenhuma unidade encontrada com os filtros fornecidos.'
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Falha no servidor ao processar o filtro.' });
  }
});

// Inicia o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
