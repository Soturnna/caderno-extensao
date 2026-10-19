import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Caderno de Soluções',
    description: 'Lições de fórmulas Excel (PT-BR), DAX e SQL do time, em um painel lateral ao lado da sua planilha.',
    permissions: ['sidePanel', 'storage'],
    host_permissions: ['https://soturnna.github.io/*'],
    action: {
      default_title: 'Abrir Caderno de Soluções (Alt+Shift+C)'
    },
    commands: {
      _execute_action: {
        suggested_key: { default: 'Alt+Shift+C' },
        description: 'Abrir o Caderno de Soluções'
      }
    }
  }
});
