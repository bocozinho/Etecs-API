const express = require('express');
const axios = require('axios');
const app = express();
const PORT = 3000;

app.use(express.json());

const etecs = require('./etecs.json');

async function buscarDadosEtecs() {
  return etecs;
}


app.get('/', (req, res) => {
  res.send('Servidor de API ETECs rodando. Acesse /etecs ou /etecs/cursos para filtrar.');
});

app.get('/etecs', async (req, res) => {
  try {
    const dados = await buscarDadosEtecs();
    res.status(200).json(dados);
  } catch (error) {
    res.status(500).json({ erro: 'Falha ao buscar dados da API externa.' });
  }
});

app.get('/etecs/cursos', async (req, res) => {
  try {
    const { cidade, curso } = req.query; 
    let resultados = await buscarDadosEtecs();

    if (cidade) {
      const cidadeFormatada = cidade.toLowerCase().trim();
      resultados = resultados.filter(etec => 
        etec.cidade && etec.cidade.toLowerCase().includes(cidadeFormatada)
      );
    }

    if (curso) {
      const cursoFormatado = curso.toLowerCase().trim();
      resultados = resultados.filter(etec => 
        etec.cursos_oferecidos && etec.cursos_oferecidos.some(c => c.toLowerCase().includes(cursoFormatado))
      );
    }

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
    res.status(500).json({ erro: 'Falha no servidor ao processar o filtro.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);

});

