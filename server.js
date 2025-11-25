const express = require('express');
const app = express();
const PORT = 3000;

const etecs = require('./etecs.json');
const cors = require('cors');

app.use(cors());
app.use(express.json());

// Normalização de texto robusta
function normalizarTexto(texto) {
  if (!texto) return '';
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

// CORREÇÃO DAS INCONSISTÊNCIAS DO WEB SCRAPING
function corrigirInconsistencias(etec) {
  let cidadeCorrigida = etec.cidade;
  
  // Corrigir cidades que estão como bairros
  const correcoes = {
    'morumbi (paraisopolis)': 'são paulo',
    'vila das belezas': 'são paulo', 
    'casa verde': 'são paulo',
    'balneario jussara': 'mongagua',
    'jardim rio da praia': 'bertioga',
    'helena maria': 'guaruja',
    'real paraiso': 'monte alto',
    'centro': 'osvaldo cruz',
    'jardim boa vista': 'serrana',
    'bairro santo antonio': 'batatais'
  };
  
  const cidadeNormalizada = normalizarTexto(cidadeCorrigida);
  if (correcoes[cidadeNormalizada]) {
    cidadeCorrigida = correcoes[cidadeNormalizada];
  }
  
  return {
    ...etec,
    cidade: cidadeCorrigida,
    cidadeOriginal: etec.cidade // Mantém original para referência
  };
}

// Formatação completa da ETEC
function formatarEtec(etec) {
  const etecCorrigida = corrigirInconsistencias(etec);
  
  return {
    name: etecCorrigida.name,
    id: etecCorrigida.id,
    link: etecCorrigida.link,
    endereco: etecCorrigida.endereco,
    cep: etecCorrigida.cep,
    cidade: etecCorrigida.cidade,
    cidadeOriginal: etecCorrigida.cidadeOriginal,
    estado: etecCorrigida.estado,
    telefone: etecCorrigida.telefone,
    email: etecCorrigida.email,
    site: etecCorrigida.site,
    totalCursos: etecCorrigida.cursos ? etecCorrigida.cursos.length : 0,
    cursos: etecCorrigida.cursos ? etecCorrigida.cursos.map(c => ({
      nome: c.nome,
      link: c.link,
      periodo: c.periodo,
      vagas: c.vagas,
      // EXTRA: Detecção automática de modalidade
      modalidade: detectarModalidade(c.nome)
    })) : []
  };
}

// Detecção inteligente de modalidade do curso
function detectarModalidade(nomeCurso) {
  const nome = normalizarTexto(nomeCurso);
  
  if (nome.includes('ensino medio') && nome.includes('integrado')) {
    return 'ensino-medio-integrado';
  } else if (nome.includes('ensino medio') && nome.includes('eja')) {
    return 'ensino-medio-eja';
  } else if (nome.includes('ensino medio') && !nome.includes('integrado')) {
    return 'ensino-medio';
  } else if (nome.includes('integrado') && !nome.includes('ensino medio')) {
    return 'tecnico-integrado';
  } else if (nome.includes('concomitante')) {
    return 'tecnico-concomitante';
  } else if (nome.includes('tecnico') || nome.includes('técnico')) {
    return 'tecnico-subsequente';
  }
  
  return 'outros';
}

// Processar todas as ETECs
const etecsFormatadas = etecs.map(formatarEtec).sort((a, b) => a.name.localeCompare(b.name));

// 📊 ESTATÍSTICAS (útil para debug)
console.log('📈 ESTATÍSTICAS DA API:');
console.log(`- Total de ETECs: ${etecsFormatadas.length}`);
console.log(`- Total de cursos: ${etecsFormatadas.reduce((acc, etec) => acc + etec.totalCursos, 0)}`);

const cidadesUnicas = [...new Set(etecsFormatadas.map(e => e.cidade))].sort();
console.log(`- Cidades únicas: ${cidadesUnicas.length}`);
console.log(`- Cidades: ${cidadesUnicas.join(', ')}`);

// 🎯 ROTAS PRINCIPAIS
app.get('/', (req, res) => {
  res.json({
    mensagem: 'API ETECs - Versão Melhorada',
    rotas: {
      '/etecs': 'Lista de nomes das ETECs',
      '/all': 'Todos os dados completos', 
      '/cidades': 'Lista de cidades corrigidas',
      '/cursos': 'Lista de cursos únicos',
      '/busca?cidade=X&curso=Y&nome=Z': 'Busca combinada',
      '/estatisticas': 'Estatísticas da API'
    }
  });
});

// 📈 Estatísticas
app.get('/estatisticas', (req, res) => {
  const estatisticas = {
    totalEtecs: etecsFormatadas.length,
    totalCursos: etecsFormatadas.reduce((acc, etec) => acc + etec.totalCursos, 0),
    cidades: cidadesUnicas.length,
    cursosUnicos: [...new Set(etecsFormatadas.flatMap(e => e.cursos.map(c => c.nome)))].length,
    cidadesDisponiveis: cidadesUnicas
  };
  res.json(estatisticas);
});

// 🏫 Listar ETECs
app.get('/etecs', (req, res) => {
  const nomes = etecsFormatadas.map(e => e.name);
  res.json(nomes);
});

// 📋 Todos os dados
app.get('/all', (req, res) => {
  res.json(etecsFormatadas);
});

// 🏙️ Cidades CORRIGIDAS
app.get('/cidades', (req, res) => {
  res.json(cidadesUnicas);
});

// 📚 Cursos únicos
app.get('/cursos', (req, res) => {
  const cursosSet = new Set();
  etecsFormatadas.forEach(etec => {
    etec.cursos.forEach(c => cursosSet.add(c.nome));
  });
  res.json([...cursosSet].sort());
});

// 🔍 BUSCA INTELIGENTE (SUPER MELHORADA)
app.get('/busca', (req, res) => {
  const { cidade, curso, nome, modalidade } = req.query;

  let resultados = [...etecsFormatadas];

  // Busca por cidade (AGORA FUNCIONA PERFEITAMENTE)
  if (cidade) {
    const cidadeFmt = normalizarTexto(cidade);
    resultados = resultados.filter(etec => {
      const camposBusca = [
        etec.cidade, 
        etec.cidadeOriginal,
        etec.endereco, 
        etec.name
      ].map(normalizarTexto);
      
      return camposBusca.some(campo => campo.includes(cidadeFmt));
    });
  }

  // Busca por curso
  if (curso) {
    const cursoFmt = normalizarTexto(curso);
    resultados = resultados.map(etec => {
      const cursosFiltrados = etec.cursos.filter(c => 
        normalizarTexto(c.nome).includes(cursoFmt)
      );
      return { 
        ...etec, 
        cursos: cursosFiltrados, 
        totalCursos: cursosFiltrados.length 
      };
    }).filter(etec => etec.cursos.length > 0);
  }

  // Busca por modalidade
  if (modalidade) {
    const modalidadeFmt = normalizarTexto(modalidade);
    resultados = resultados.map(etec => {
      const cursosFiltrados = etec.cursos.filter(c => 
        normalizarTexto(c.modalidade).includes(modalidadeFmt)
      );
      return { 
        ...etec, 
        cursos: cursosFiltrados, 
        totalCursos: cursosFiltrados.length 
      };
    }).filter(etec => etec.cursos.length > 0);
  }

  // Busca por nome da ETEC
  if (nome) {
    const nomeFmt = normalizarTexto(nome);
    resultados = resultados.filter(etec => 
      normalizarTexto(etec.name).includes(nomeFmt)
    );
  }

  if (!resultados.length) {
    return res.status(404).json({ 
      erro: 'Nenhuma ETEC encontrada com os filtros fornecidos.',
      sugestao: 'Tente buscar por "sao paulo" em vez de "São Paulo"'
    });
  }

  res.json(resultados);
});

// 🎯 ROTAS ESPECÍFICAS (para compatibilidade)
app.get('/busca/cidade', (req, res) => {
  const { cidade } = req.query;
  if (!cidade) return res.status(400).json({ erro: 'Informe a cidade' });

  const cidadeFmt = normalizarTexto(cidade);
  const resultados = etecsFormatadas.filter(etec => {
    const campos = [etec.cidade, etec.cidadeOriginal, etec.endereco, etec.name]
      .map(normalizarTexto);
    return campos.some(campo => campo.includes(cidadeFmt));
  });

  if (!resultados.length) {
    return res.status(404).json({ erro: 'Nenhuma ETEC encontrada para esta cidade.' });
  }

  res.json(resultados);
});

app.get('/busca/curso', (req, res) => {
  const { curso } = req.query;
  if (!curso) return res.status(400).json({ erro: 'Informe o curso' });

  const cursoFmt = normalizarTexto(curso);
  const resultados = etecsFormatadas.map(etec => {
    const cursosFiltrados = etec.cursos.filter(c => 
      normalizarTexto(c.nome).includes(cursoFmt)
    );
    return { 
      ...etec, 
      cursos: cursosFiltrados, 
      totalCursos: cursosFiltrados.length 
    };
  }).filter(etec => etec.cursos.length > 0);

  if (!resultados.length) {
    return res.status(404).json({ erro: 'Nenhuma ETEC oferece este curso.' });
  }

  res.json(resultados);
});

// 🚀 INICIAR SERVIDOR
app.listen(PORT, () => {
  console.log(`🚀 API ETECs ULTRA-MELHORADA rodando em http://localhost:${PORT}`);
  console.log(`📊 ${etecsFormatadas.length} ETECs carregadas`);
  console.log(`🏙️ ${cidadesUnicas.length} cidades disponíveis`);
});
