import fs from "node:fs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://oaissugnjvrobhdrnain.supabase.co";
const secretKey = process.env.SUPABASE_SECRET_KEY || "";

if (!secretKey) {
  console.log("SUPABASE_SECRET_KEY not set in environment, skipping seed.");
  process.exit(0);
}

async function main() {
  console.log("Checking exercicios_interativos in Supabase...");
  const res = await fetch(`${url}/rest/v1/exercicios_interativos?select=id,titulo`, {
    headers: {
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Error querying table:", errText);
    process.exit(1);
  }

  const existing = await res.json();
  console.log(`Found ${existing?.length || 0} existing exercises in Supabase.`);

  if (existing && existing.length > 0) {
    console.log("Exercises already exist in Supabase, skipping seed.");
    return;
  }

  // Seed 4 initial exercises
  const seeds = [
    {
      titulo: "Everyday English: Essential Grammar & Prepositions",
      descricao: "Pratique o uso correto de tempos verbais e preposições em contextos cotidianos.",
      instrucoes: "Leia atentamente cada enunciado e escolha a única alternativa gramaticalmente correta entre as 4 opções.",
      tipo: "multipla_escolha",
      nivel: "A1",
      categoria: "Grammar & Vocabulary",
      questoes: [
        {
          id: "q-mc-01",
          enunciado: "Choose the sentence that is grammatically correct in the Present Simple:",
          pontos: 2.5,
          alternativas: [
            { id: "alt-01-a", texto: "She go to work by bus every weekday." },
            { id: "alt-01-b", texto: "She goes to work by bus every weekday." },
            { id: "alt-01-c", texto: "She is go to work by bus every weekday." },
            { id: "alt-01-d", texto: "She going to work by bus every weekday." },
          ],
          alternativaCorretaId: "alt-01-b",
          explicacao: "Na terceira pessoa do singular (he, she, it) no Present Simple, o verbo recebe a terminação '-es': 'goes'.",
        },
        {
          id: "q-mc-02",
          enunciado: "Select the correct preposition of time: 'I will meet you ___ Friday afternoon.'",
          pontos: 2.5,
          alternativas: [
            { id: "alt-02-a", texto: "at" },
            { id: "alt-02-b", texto: "in" },
            { id: "alt-02-c", texto: "on" },
            { id: "alt-02-d", texto: "by" },
          ],
          alternativaCorretaId: "alt-02-c",
          explicacao: "Usamos a preposição 'on' para dias da semana e dias combinados com períodos: 'on Friday afternoon'.",
        },
        {
          id: "q-mc-03",
          enunciado: "What is the correct negative form of 'They have a meeting now' in the Present Simple?",
          pontos: 2.5,
          alternativas: [
            { id: "alt-03-a", texto: "They doesn't have a meeting now." },
            { id: "alt-03-b", texto: "They not have a meeting now." },
            { id: "alt-03-c", texto: "They don't have a meeting now." },
            { id: "alt-03-d", texto: "They aren't have a meeting now." },
          ],
          alternativaCorretaId: "alt-03-c",
          explicacao: "Com o pronome 'they', o auxiliar negativo do Present Simple é 'don't' (do not).",
        },
        {
          id: "q-mc-04",
          enunciado: "Choose the correct question format in English:",
          pontos: 2.5,
          alternativas: [
            { id: "alt-04-a", texto: "Where you live in London?" },
            { id: "alt-04-b", texto: "Where do you live in London?" },
            { id: "alt-04-c", texto: "Where does you live in London?" },
            { id: "alt-04-d", texto: "Where are you live in London?" },
          ],
          alternativaCorretaId: "alt-04-b",
          explicacao: "Perguntas com o pronome 'you' no presente exigem o verbo auxiliar 'do': 'Where do you live?'.",
        },
      ],
      baralho_vocabulario_id: "baralho-001",
      destino_tipo: "geral",
      professor_id: "prof-001",
      professor_nome: "Paulo Ricardo",
      status: "publicado",
      nota_maxima: 10,
      nota_minima_aprovacao: 7.0,
      politica_gabarito: "apos_tentativa",
      tempo_estimado_minutos: 10,
      versao: 1,
    },
    {
      titulo: "Reading & Listening: A Sunday in London",
      descricao: "Aprimore sua habilidade de interpretação textual em inglês acompanhada de narração em áudio gravada.",
      instrucoes: "Ouça o áudio da narração, leia com atenção os parágrafos do texto e responda às 4 perguntas de interpretação.",
      tipo: "leitura_audio",
      nivel: "A2",
      categoria: "Reading & Listening",
      texto_conteudo: `Sunday mornings in London have a very distinctive rhythm. While weekdays are marked by the fast-paced rush of commuters heading toward the City and Canary Wharf, Sundays begin much more slowly.\n\nSarah lives in Greenwich, a historic neighborhood in South East London famous for the Royal Observatory and its expansive royal park. At around 8:30 AM, she walks down to the local bakery on Royal Hill to buy freshly baked sourdough bread and almond croissants.\n\nAfter breakfast, Sarah meets her friend Marcus at Greenwich Market. The market has been active since the 18th century and is celebrated for its independent artisan stalls, handcrafted jewelry, and global street food. Today, they decide to try Ethiopian coffee while browsing vintage books.\n\nBy early afternoon, clouds start to gather over the River Thames. Instead of taking the Underground, Sarah takes the Thames Clipper ferry back to central London, enjoying the panoramic view of Tower Bridge and St. Paul's Cathedral from the open deck.`,
      audio_url: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg",
      audio_nome: "sunday_in_london.ogg",
      audio_duracao_segundos: 65,
      questoes: [
        {
          id: "q-rd-01",
          enunciado: "Where does Sarah live in London?",
          pontos: 2.5,
          alternativas: [
            { id: "alt-rd-01-a", texto: "In Canary Wharf" },
            { id: "alt-rd-01-b", texto: "In Central London near St. Paul's" },
            { id: "alt-rd-01-c", texto: "In Greenwich, South East London" },
            { id: "alt-rd-01-d", texto: "Near Tower Bridge" },
          ],
          alternativaCorretaId: "alt-rd-01-c",
          explicacao: "O texto informa explicitamente no segundo parágrafo: 'Sarah lives in Greenwich, a historic neighborhood in South East London'.",
        },
        {
          id: "q-rd-02",
          enunciado: "What does Sarah buy at the local bakery on Royal Hill?",
          pontos: 2.5,
          alternativas: [
            { id: "alt-rd-02-a", texto: "Bagels and black tea" },
            { id: "alt-rd-02-b", texto: "Sourdough bread and almond croissants" },
            { id: "alt-rd-02-c", texto: "Ethiopian coffee and vintage books" },
            { id: "alt-rd-02-d", texto: "Pancakes and fresh orange juice" },
          ],
          alternativaCorretaId: "alt-rd-02-b",
          explicacao: "O texto afirma: 'walks down to the local bakery on Royal Hill to buy freshly baked sourdough bread and almond croissants'.",
        },
        {
          id: "q-rd-03",
          enunciado: "What makes Greenwich Market historic according to the text?",
          pontos: 2.5,
          alternativas: [
            { id: "alt-rd-03-a", texto: "It is the only market next to Tower Bridge" },
            { id: "alt-rd-03-b", texto: "It has been active since the 18th century" },
            { id: "alt-rd-03-c", texto: "It was built by the Royal Observatory" },
            { id: "alt-rd-03-d", texto: "It only opens on Sunday afternoons" },
          ],
          alternativaCorretaId: "alt-rd-03-b",
          explicacao: "O terceiro parágrafo diz: 'The market has been active since the 18th century and is celebrated for its independent artisan stalls'.",
        },
        {
          id: "q-rd-04",
          enunciado: "How does Sarah return to Central London in the afternoon?",
          pontos: 2.5,
          alternativas: [
            { id: "alt-rd-04-a", texto: "By taking the London Underground (Jubilee Line)" },
            { id: "alt-rd-04-b", texto: "By driving a car across Tower Bridge" },
            { id: "alt-rd-04-c", texto: "By riding a bicycle along the river path" },
            { id: "alt-rd-04-d", texto: "By boarding the Thames Clipper ferry on the river" },
          ],
          alternativaCorretaId: "alt-rd-04-d",
          explicacao: "O texto conclui: 'Instead of taking the Underground, Sarah takes the Thames Clipper ferry back to central London'.",
        },
      ],
      baralho_vocabulario_id: "baralho-001",
      destino_tipo: "geral",
      professor_id: "prof-001",
      professor_nome: "Paulo Ricardo",
      status: "publicado",
      nota_maxima: 10,
      nota_minima_aprovacao: 7.0,
      politica_gabarito: "apos_tentativa",
      tempo_estimado_minutos: 15,
      versao: 1,
    },
    {
      titulo: "Business Communication: Professional Email Etiquette",
      descricao: "Exercite a linguagem corporativa e as convenções para e-mails e reuniões em inglês.",
      instrucoes: "Avalie os cenários profissionais e escolha a opção mais elegante e adequada.",
      tipo: "multipla_escolha",
      nivel: "B1",
      categoria: "Business English",
      questoes: [
        {
          id: "q-biz-01",
          enunciado: "Which closing is most appropriate for a formal business proposal sent to an external client?",
          pontos: 3.3,
          alternativas: [
            { id: "alt-biz-01-a", texto: "Cheers, talk soon!" },
            { id: "alt-biz-01-b", texto: "Sincerely regards," },
            { id: "alt-biz-01-c", texto: "Kind regards," },
            { id: "alt-biz-01-d", texto: "Catch you later," },
          ],
          alternativaCorretaId: "alt-biz-01-c",
          explicacao: "'Kind regards' ou 'Best regards' é o padrão ouro de cortesia corporativa em inglês internacional.",
        },
        {
          id: "q-biz-02",
          enunciado: "How should you politely ask someone to clarify a point during a conference call?",
          pontos: 3.3,
          alternativas: [
            { id: "alt-biz-02-a", texto: "What did you say? Speak clearer." },
            { id: "alt-biz-02-b", texto: "Could you please elaborate on that last point?" },
            { id: "alt-biz-02-c", texto: "I didn't understand anything." },
            { id: "alt-biz-02-d", texto: "Repeat everything from the beginning." },
          ],
          alternativaCorretaId: "alt-biz-02-b",
          explicacao: "'Could you please elaborate on that last point?' é diplomático, cortês e assertivo.",
        },
        {
          id: "q-biz-03",
          enunciado: "What does 'touch base' mean in a business context?",
          pontos: 3.4,
          alternativas: [
            { id: "alt-biz-03-a", texto: "To sign an official contract" },
            { id: "alt-biz-03-b", texto: "To cancel a planned meeting" },
            { id: "alt-biz-03-c", texto: "To brief someone quickly or follow up on progress" },
            { id: "alt-biz-03-d", texto: "To physically travel to headquarters" },
          ],
          alternativaCorretaId: "alt-biz-03-c",
          explicacao: "'To touch base' é um idiom muito comum para fazer um alinhamento rápido ou acompanhamento de status.",
        },
      ],
      baralho_vocabulario_id: "baralho-002",
      destino_tipo: "geral",
      professor_id: "prof-001",
      professor_nome: "Paulo Ricardo",
      status: "publicado",
      nota_maxima: 10,
      nota_minima_aprovacao: 7.0,
      politica_gabarito: "apos_tentativa",
      tempo_estimado_minutos: 12,
      versao: 1,
    },
    {
      titulo: "Reading: The Future of Global Remote Work",
      descricao: "Texto analítico avançado discutindo produtividade, colaboração assíncrona e cultura global.",
      instrucoes: "Analise as ideias centrais e as inferências implícitas no artigo antes de assinalar as alternativas.",
      tipo: "leitura_audio",
      nivel: "B2",
      categoria: "Workplace & Technology",
      texto_conteudo: `The shift toward distributed workforces has redefined corporate hierarchies and modern geography. Organizations that initially viewed remote arrangements as a temporary contingency have discovered that geographical decentralization unlocks access to world-class talent without the constraints of metropolitan relocation.\n\nHowever, thriving in an asynchronous environment demands a fundamental transformation in communication philosophy. Passive consensus and informal office serendipity must be replaced by deliberate documentation, explicit expectations, and high-trust autonomy. Teams that master structured written discourse consistently outperform those attempting to replicate eight-hour video marathons.`,
      questoes: [
        {
          id: "q-b2-01",
          enunciado: "According to the passage, what is the main advantage discovered by decentralized organizations?",
          pontos: 5,
          alternativas: [
            { id: "alt-b2-01-a", texto: "Lower operational energy consumption" },
            { id: "alt-b2-01-b", texto: "Access to global talent free from relocation constraints" },
            { id: "alt-b2-01-c", texto: "Elimination of written documentation" },
            { id: "alt-b2-01-d", texto: "Shorter overall working hours for executives" },
          ],
          alternativaCorretaId: "alt-b2-01-b",
          explicacao: "O texto pontua: 'unlocks access to world-class talent without the constraints of metropolitan relocation'.",
        },
        {
          id: "q-b2-02",
          enunciado: "What does the author suggest must replace 'informal office serendipity'?",
          pontos: 5,
          alternativas: [
            { id: "alt-b2-02-a", texto: "Continuous video calls throughout the day" },
            { id: "alt-b2-02-b", texto: "Deliberate documentation and structured written discourse" },
            { id: "alt-b2-02-c", texto: "Strict biometric clock-in monitoring" },
            { id: "alt-b2-02-d", texto: "Frequent return to physical headquarters" },
          ],
          alternativaCorretaId: "alt-b2-02-b",
          explicacao: "O segundo parágrafo enfatiza: 'must be replaced by deliberate documentation, explicit expectations, and high-trust autonomy'.",
        },
      ],
      destino_tipo: "geral",
      professor_id: "prof-001",
      professor_nome: "Paulo Ricardo",
      status: "publicado",
      nota_maxima: 10,
      nota_minima_aprovacao: 7.0,
      politica_gabarito: "apos_tentativa",
      tempo_estimado_minutos: 15,
      versao: 1,
    },
  ];

  const inserted = [];
  for (const s of seeds) {
    const insertRes = await fetch(`${url}/rest/v1/exercicios_interativos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: secretKey,
        Authorization: `Bearer ${secretKey}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(s),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      console.error(`Error inserting seed exercise "${s.titulo}":`, errText);
      process.exit(1);
    }

    const item = await insertRes.json();
    inserted.push(item[0]);
  }

  console.log(`Successfully seeded ${inserted.length} exercises into Supabase:`);
  inserted.forEach((e) => console.log(` - [${e.id}] ${e.titulo}`));
}

main().catch(console.error);
