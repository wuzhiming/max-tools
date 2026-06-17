// src/tools/screenshot/renderer/settings/index.tsx
import React, { useEffect, useState } from 'react'
import type { ToolSettingsProps } from '@shared/types/tool-manifest'
import { SettingRow } from '@renderer/shared/components/SettingRow'
import { Toggle } from '@renderer/shared/components/Toggle'
import { FilePathPicker } from '@renderer/shared/components/FilePathPicker'
import { ShortcutRecorder } from '@renderer/shared/components/ShortcutRecorder'

export default function ScreenshotSettings({ store, shortcuts, setShortcut, toast }: ToolSettingsProps) {
  const [saveDir, setSaveDir] = useState<string>(store.get('saveDir', ''))
  const [template, setTemplate] = useState<string>(
    store.get('filenameTemplate', 'screenshot-{yyyy}-{MM}-{dd}-{HH}-{mm}-{ss}'),
  )
  const [windowDetect, setWindowDetect] = useState<boolean>(store.get('windowDetect', true))
  const [colorFormat, setColorFormat] = useState<string>(store.get('colorFormat', 'HEX'))
  const [defaultBlockSize, setDefaultBlockSize] = useState<number>(store.get('defaultBlockSize', 12))

  useEffect(() => store.set('saveDir', saveDir), [saveDir, store])
  useEffect(() => store.set('filenameTemplate', template), [template, store])
  useEffect(() => store.set('windowDetect', windowDetect), [windowDetect, store])
  useEffect(() => store.set('colorFormat', colorFormat), [colorFormat, store])
  useEffect(() => store.set('defaultBlockSize', defaultBlockSize), [defaultBlockSize, store])

  const findShortcut = (key: string) => shortcuts.find((s) => s.key === key)?.combo ?? ''

  return (
    <div>
      <h1>截图</h1>

      <SettingRow label="启用" hint="关闭后菜单栏与快捷键不可用">
        <Toggle checked={true} onChange={() => toast('暂不支持，所有工具默认启用', 'info')} />
      </SettingRow>

      <SettingRow label="保存目录" hint="另存为时的默认位置">
        <FilePathPicker value={saveDir} onChange={setSaveDir} placeholder="~/Pictures/max-tools" />
      </SettingRow>

      <SettingRow label="文件名模板" hint="支持 {yyyy} {MM} {dd} {HH} {mm} {ss}">
        <input
          type="text"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          style={{ width: '100%' }}
        />
      </SettingRow>

      <SettingRow label="窗口自动识别" hint="鼠标悬停 app 窗口高亮（需 Accessibility 权限）">
        <Toggle checked={windowDetect} onChange={setWindowDetect} />
      </SettingRow>

      <SettingRow label="取色格式">
        <select value={colorFormat} onChange={(e) => setColorFormat(e.target.value)}>
          <option value="HEX">HEX</option>
          <option value="RGB">RGB</option>
          <option value="HSL">HSL</option>
        </select>
      </SettingRow>

      <SettingRow label="默认马赛克块">
        <input
          type="number"
          min={4}
          max={64}
          value={defaultBlockSize}
          onChange={(e) => setDefaultBlockSize(Number(e.target.value))}
        />
      </SettingRow>

      <h2 style={{ marginTop: 24, fontSize: 14 }}>快捷键</h2>

      <SettingRow label="区域选区">
        <ShortcutRecorder value={findShortcut('region')} onChange={(c) => setShortcut('region', c)} />
      </SettingRow>

      <SettingRow label="全屏（鼠标所在屏）">
        <ShortcutRecorder value={findShortcut('fullscreen')} onChange={(c) => setShortcut('fullscreen', c)} />
      </SettingRow>
    </div>
  )
}
