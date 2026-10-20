export const zh = {
  title: 'DSH 工具箱',
  description: '按需开启实用功能，设置会自动保存。',
  fixTitle: '修复 VS Code 打开失败',
  fixDescription: '适用于 Windows Desktop。从右上角菜单打开工作目录时生效，无需重启 DSH。',
  loading: '正在读取工具箱设置…',
  unavailable: '工具箱配置暂不可用，请确认插件已启用并连接到本机宿主。',
  readOnly: '当前连接的设置为只读，无法修改。',
  saving: '正在保存…',
  failed: '保存未确认，开关显示宿主当前值。请检查连接后重试。',
  saved: '已保存。',
}
export const en: Record<keyof typeof zh, string> = {
  title: 'DSH Toolbox',
  description: 'Enable the features you need. Changes save automatically.',
  fixTitle: 'Fix opening folders in VS Code',
  fixDescription: 'For Windows Desktop. Applies when opening a working directory from the top-right menu, without restarting DSH.',
  loading: 'Loading toolbox settings…',
  unavailable: 'Toolbox settings are unavailable. Enable the plugin and connect to a local host.',
  readOnly: 'Settings are read-only on this connection.',
  saving: 'Saving…',
  failed: 'Save was not confirmed. The switch shows the current host value. Check your connection and retry.',
  saved: 'Saved.',
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { 'dsh-toolbox': keyof typeof zh }
}
