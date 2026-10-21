
const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Front-end
app.use(express.static(path.join(__dirname, "../frontend")));

// Banco de dados em JSON
const DB_FILE = path.join(__dirname, "db.json");

function bancoVazio() {
  return {
    usuarios: [],
    pacientes: [],
    triagens: [],
    consultas: [],
    tv_chamada: null,
    tv_historico: []
  };
}

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    const dbInicial = bancoVazio();
    writeDB(dbInicial);
    return dbInicial;
  }

  const conteudo = fs.readFileSync(DB_FILE, "utf8");
  const db = conteudo.trim()
    ? JSON.parse(conteudo)
    : bancoVazio();

  // Garante que as listas necessárias existam
  const padrao = bancoVazio();

  for (const chave of [
    "usuarios",
    "pacientes",
    "triagens",
    "consultas",
    "tv_historico"
  ]) {
    if (!Array.isArray(db[chave])) {
      db[chave] = padrao[chave];
    }
  }

  if (db.tv_chamada === undefined) {
    db.tv_chamada = null;
  }

  return db;
}

function writeDB(data) {
  fs.writeFileSync(
    DB_FILE,
    JSON.stringify(data, null, 2),
    "utf8"
  );
}

// ========================================
// USUÁRIOS - CADASTRAR
// ========================================

app.post("/usuario", (req, res) => {
  try {
    const { usuario, senha, tipo } = req.body || {};

    if (
      typeof usuario !== "string" ||
      typeof senha !== "string" ||
      typeof tipo !== "string" ||
      !usuario.trim() ||
      !senha ||
      !tipo.trim()
    ) {
      return res.status(400).json({
        erro: "Preencha usuário, senha e tipo de acesso."
      });
    }

    const db = readDB();

    const nomeUsuario = usuario.trim();

    const existente = db.usuarios.find(
      u =>
        typeof u.usuario === "string" &&
        u.usuario.toLowerCase() === nomeUsuario.toLowerCase()
    );

    if (existente) {
      return res.status(409).json({
        erro: "Esse nome de usuário já está cadastrado."
      });
    }

    const novoUsuario = {
      id: Date.now(),
      usuario: nomeUsuario,
      senha: senha,
      tipo: tipo.trim(),
      createdAt: new Date().toISOString()
    };

    db.usuarios.push(novoUsuario);
    writeDB(db);

    return res.status(201).json({
      mensagem: "Usuário cadastrado com sucesso!",
      usuario: {
        id: novoUsuario.id,
        usuario: novoUsuario.usuario,
        tipo: novoUsuario.tipo,
        createdAt: novoUsuario.createdAt
      }
    });
  } catch (erro) {
    console.error("Erro ao cadastrar usuário:", erro);

    return res.status(500).json({
      erro: "Não foi possível cadastrar o usuário."
    });
  }
});

// ========================================
// USUÁRIOS - LISTAR
// ========================================

app.get("/usuarios", (req, res) => {
  try {
    const db = readDB();

    // Não envia as senhas para o navegador
    const usuarios = db.usuarios.map(u => ({
      id: u.id,
      usuario: u.usuario,
      tipo: u.tipo,
      createdAt: u.createdAt
    }));

    return res.json(usuarios);
  } catch (erro) {
    console.error("Erro ao listar usuários:", erro);

    return res.status(500).json({
      erro: "Não foi possível carregar os usuários."
    });
  }
});

// ========================================
// LOGIN
// ========================================

app.post("/login", (req, res) => {
  try {
    const { usuario, senha } = req.body || {};

    if (
      typeof usuario !== "string" ||
      typeof senha !== "string"
    ) {
      return res.status(400).json({
        erro: "Informe o usuário e a senha."
      });
    }

    const db = readDB();

    const user = db.usuarios.find(u =>
      u.usuario === usuario.trim() &&
      u.senha === senha
    );

    if (!user) {
      return res.status(401).json({
        erro: "Login inválido."
      });
    }

    // Retorna os dados necessários, sem enviar a senha
    return res.json({
      id: user.id,
      usuario: user.usuario,
      tipo: user.tipo
    });
  } catch (erro) {
    console.error("Erro no login:", erro);

    return res.status(500).json({
      erro: "Erro interno ao realizar login."
    });
  }
});

// ========================================
// ATENDIMENTO - CADASTRAR PACIENTE
// ========================================

app.post("/atendimento", (req, res) => {
  try {
    const db = readDB();

    const paciente = {
      id: Date.now(),
      nome: req.body.nome,
      cpf: req.body.cpf,
      tipo: req.body.tipo,
      status: "triagem",
      createdAt: new Date().toISOString()
    };

    db.pacientes.push(paciente);
    writeDB(db);

    return res.status(201).json(paciente);
  } catch (erro) {
    console.error("Erro no atendimento:", erro);

    return res.status(500).json({
      erro: "Não foi possível cadastrar o paciente."
    });
  }
});

// LISTAR PACIENTES
app.get("/pacientes", (req, res) => {
  try {
    const db = readDB();
    return res.json(db.pacientes);
  } catch (erro) {
    console.error("Erro ao listar pacientes:", erro);

    return res.status(500).json({
      erro: "Não foi possível carregar os pacientes."
    });
  }
});

// ========================================
// TRIAGEM
// ========================================

app.post("/triagem", (req, res) => {
  try {
    const db = readDB();

    let risco = req.body.risco;
    const temperatura = Number(req.body.temperatura);

    if (Number.isFinite(temperatura) && temperatura >= 39) {
      risco = "vermelho";
    } else if (
      Number.isFinite(temperatura) &&
      temperatura >= 38
    ) {
      risco = "amarelo";
    } else if (!risco) {
      risco = "verde";
    }

    const triagem = {
      id: Date.now(),
      nome: req.body.nome,
      sintoma: req.body.sintoma,
      temperatura: req.body.temperatura,
      alergia: req.body.alergia,
      observacao: req.body.observacao,
      risco,
      status: "aguardando_medico",
      createdAt: new Date().toISOString()
    };

    db.triagens.push(triagem);
    writeDB(db);

    return res.status(201).json(triagem);
  } catch (erro) {
    console.error("Erro na triagem:", erro);

    return res.status(500).json({
      erro: "Não foi possível registrar a triagem."
    });
  }
});

// LISTAR TRIAGENS
app.get("/triagens", (req, res) => {
  try {
    const db = readDB();
    return res.json(db.triagens);
  } catch (erro) {
    console.error("Erro ao listar triagens:", erro);

    return res.status(500).json({
      erro: "Não foi possível carregar as triagens."
    });
  }
});

// ========================================
// MÍDIA INDOOR - TV
// ========================================

app.post("/tv/chamar", (req, res) => {
  try {
    const db = readDB();

    const chamada = {
      id: Date.now().toString(),
      localTipo: req.body.localTipo,
      localNumero: req.body.localNumero,
      paciente: req.body.paciente,
      hora: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
      })
    };

    db.tv_chamada = chamada;
    db.tv_historico.unshift(chamada);

    if (db.tv_historico.length > 5) {
      db.tv_historico.pop();
    }

    writeDB(db);

    return res.json(chamada);
  } catch (erro) {
    console.error("Erro na chamada da TV:", erro);

    return res.status(500).json({
      erro: "Não foi possível enviar a chamada."
    });
  }
});

// CONSULTAR CHAMADA E HISTÓRICO
app.get("/tv/chamada", (req, res) => {
  try {
    const db = readDB();

    return res.json({
      chamada: db.tv_chamada,
      historico: db.tv_historico
    });
  } catch (erro) {
    console.error("Erro ao consultar TV:", erro);

    return res.status(500).json({
      erro: "Não foi possível consultar as chamadas."
    });
  }
});

// ========================================
// LISTA DE MEDICAÇÕES
// ========================================

app.get("/lista-medicacoes", (req, res) => {
  return res.json([
    "Dipirona",
    "Paracetamol",
    "Ibuprofeno",
    "Amoxicilina",
    "Azitromicina",
    "Loratadina",
    "Omeprazol",
    "Buscopan",
    "Dramin",
    "Soro fisiológico"
  ]);
});

// ========================================
// CONSULTA MÉDICA
// ========================================

app.post("/consulta", (req, res) => {
  try {
    const db = readDB();

    const consulta = {
      id: Date.now(),
      paciente: req.body.paciente,
      diagnostico: req.body.diagnostico,
      medicacao: req.body.medicacao,
      obs: req.body.obs,
      createdAt: new Date().toISOString()
    };

    db.consultas.push(consulta);
    writeDB(db);

    return res.status(201).json(consulta);
  } catch (erro) {
    console.error("Erro ao registrar consulta:", erro);

    return res.status(500).json({
      erro: "Não foi possível registrar a consulta."
    });
  }
});

// LISTAR CONSULTAS/MEDICAÇÕES REGISTRADAS
app.get("/medicacoes", (req, res) => {
  try {
    const db = readDB();
    return res.json(db.consultas);
  } catch (erro) {
    console.error("Erro ao listar medicações:", erro);

    return res.status(500).json({
      erro: "Não foi possível carregar as medicações."
    });
  }
});

// ========================================
// ROTA NÃO ENCONTRADA - SEM HTML DE ERRO
// ========================================

app.use((req, res) => {
  return res.status(404).json({
    erro: "Rota não encontrada.",
    rota: req.originalUrl,
    metodo: req.method
  });
});

// TRATAMENTO DE ERROS
app.use((erro, req, res, next) => {
  console.error("Erro no servidor:", erro);

  if (res.headersSent) {
    return next(erro);
  }

  return res.status(500).json({
    erro: "Ocorreu um erro interno no servidor."
  });
});

// ========================================
// INICIAR SERVIDOR
// ========================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`NEXORA Health rodando na porta ${PORT}`);
});
