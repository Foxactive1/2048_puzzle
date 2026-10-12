# 2048 NEXUS

Jogo 2048 com identidade neon e interface adaptável para celulares, tablets e desktops. HTML, CSS e JavaScript puro, sem build ou framework.

## Jogar

- Deslize **sobre o tabuleiro** com dedo, caneta ou mouse.
- Use as setas do teclado, WASD ou os botões direcionais.
- Combine peças iguais para chegar ao 2048. Desfazer recupera a última jogada válida; Ctrl/Cmd+Z também funciona.
- Tabule pelos controles. A página permite zoom e rolagem fora do tabuleiro, e respeita a preferência do sistema por movimento reduzido.

## Modos

| Modo | Regra |
| --- | --- |
| Clássico | Alcance 2048 e escolha continuar. |
| Tempo | 3 minutos; pausa ao ocultar a aba e retoma ao continuar após uma vitória. |
| Extremo | Todas as novas peças valem 4. |
| Zen | Sem relógio ou interrupção ao chegar ao 2048; encerra quando não há movimentos. |

Tabuleiros 4×4 e 5×5, combos, conquistas e cinco melhores resultados. Recordes e conquistas são locais ao navegador, sem ranking online. A partida atual não é restaurada ao recarregar.

## Executar

```bash
python -m http.server 8000
```

Abra http://localhost:8000. Também é possível abrir `index.html` diretamente. As fontes e os ícones usam CDN; as fontes têm fallback do sistema.

## Validar

```bash
node --check game.js
node tests/engine.cjs
npm install --no-save playwright
npx playwright install chromium
node tests/browser.cjs
```

O teste verifica larguras de 320 a 1440 pixels, ausência de overflow horizontal, tamanhos do tabuleiro, controles, desfazer após movimento inválido, continuação do timer, fim do modo Zen e armazenamento indisponível. A validação automatizada usa Chromium; testes físicos em Safari/iOS e Android ainda são recomendados.

## Estrutura e deploy

- `index.html`: interface e metadados.
- `style.css`: tema neon, layout, acessibilidade e animações.
- `game.js`: regras, gestos e armazenamento local.
- `vercel.json`: headers e revalidação dos arquivos para evitar versões antigas no cache.
- `tests/browser.cjs`: regressões de interface e jogabilidade.

Na Vercel use o preset **Other**, sem comando de build, com a raiz do repositório como diretório de saída. Esta versão é uma aplicação web responsiva, não um aplicativo nativo ou PWA offline.
