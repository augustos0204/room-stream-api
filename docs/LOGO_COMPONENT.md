# Logo Component

Componente reutilizável para renderizar o logo do RoomStream com diferentes tamanhos e variantes.

## Localização

- **Partial**: `src/views/partials/logo.ejs`
- **SVG**: `src/views/partials/logo-svg.ejs`

## Uso Básico

```ejs
<%- include('../partials/logo', { size: 'md' }) %>
```

## Parâmetros

### `size` (string) - Tamanho do logo

| Valor | Dimensões | Uso recomendado |
|-------|-----------|-----------------|
| `'xs'` | 32px (w-8 h-8) | Topbar, áreas compactas |
| `'sm'` | 40px (w-10 h-10) | Headers, sidebars |
| `'md'` | 64px (w-16 h-16) | Padrão, cards |
| `'lg'` | 80px (w-20 h-20) | Páginas de login, destaque |
| `'xl'` | 96px (w-24 h-24) | Hero sections, landingpages |

**Padrão**: `'md'`

### `withBackground` (boolean) - Mostra container com gradiente

Quando `true`, renderiza o logo dentro de um container com fundo gradiente roxo/rosa.

**Padrão**: `false`

### `withShadow` (boolean) - Aplica efeito de sombra

Quando `true`, aplica a classe `logo-icon` que adiciona `drop-shadow`.

**Padrão**: `true`

### `className` (string) - Classes CSS adicionais

Classes CSS personalizadas para adicionar ao container do logo.

**Padrão**: `''` (vazio)

## Exemplos

### Logo pequeno para topbar

```ejs
<%- include('../partials/logo', { size: 'xs' }) %>
```

### Logo grande com fundo gradiente

```ejs
<%- include('../partials/logo', { size: 'lg', withBackground: true }) %>
```

### Logo sem sombra

```ejs
<%- include('../partials/logo', { size: 'md', withShadow: false }) %>
```

### Logo com classes personalizadas

```ejs
<%- include('../partials/logo', {
  size: 'sm',
  className: 'opacity-80 hover:opacity-100 transition-opacity'
}) %>
```

### Logo extra grande para hero

```ejs
<div class="text-center">
  <%- include('../partials/logo', {
    size: 'xl',
    withBackground: true,
    className: 'animate-float'
  }) %>
</div>
```

## Estrutura HTML Gerada

### Sem fundo (padrão)

```html
<div class="logo-icon relative w-16 h-16">
  <svg>...</svg>
</div>
```

### Com fundo

```html
<div class="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-2xl shadow-purple-500/50">
  <div class="logo-icon relative w-16 h-16">
    <svg>...</svg>
  </div>
</div>
```

## IDs Únicos para Gradientes SVG

O SVG do logo (`logo-svg.ejs`) gera automaticamente IDs únicos para os gradientes usando timestamp e strings aleatórias. Isso evita conflitos quando múltiplos logos aparecem na mesma página.

**Exemplo de IDs gerados:**
- `grad1_logo_1734567890_abc123xyz`
- `grad2_logo_1734567890_abc123xyz`

## CSS Necessário

O componente depende da classe `.logo-icon` definida em `main.css`:

```css
.logo-icon {
    position: relative;
    display: inline-block;
    filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.4));
}
```

## Onde está sendo usado

| Arquivo | Tamanho | Configuração |
|---------|---------|--------------|
| `platform-topbar.ejs` | `xs` | Padrão, topbar da plataforma |
| `header.ejs` | `sm` | Padrão, header legacy |
| `page-login.ejs` | `lg` | Padrão, página de login |

## Vantagens

✅ **Consistência**: Todos os logos seguem o mesmo padrão
✅ **Reutilizável**: Um único componente para toda a aplicação
✅ **Flexível**: Múltiplos tamanhos e variantes
✅ **Manutenível**: Mudanças no logo afetam toda a aplicação
✅ **Performance**: IDs únicos evitam conflitos de SVG
✅ **Type-safe**: Parâmetros documentados e validados

## Troubleshooting

### Logo não aparece ou está invisível

**Causa**: Conflito de IDs de gradientes SVG
**Solução**: O partial `logo-svg.ejs` já gera IDs únicos automaticamente

### Logo com cores erradas

**Causa**: CSS customizado sobrescrevendo gradientes
**Solução**: Verifique se não há estilos conflitantes no componente pai

### Logo sem sombra

**Causa**: Parâmetro `withShadow: false` ou classe `.logo-icon` não aplicada
**Solução**: Remova `withShadow: false` ou verifique o CSS

### Tamanho incorreto

**Causa**: Valor inválido no parâmetro `size`
**Solução**: Use um dos valores válidos: `'xs'`, `'sm'`, `'md'`, `'lg'`, `'xl'`
