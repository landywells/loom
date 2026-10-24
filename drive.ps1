Add-Type -AssemblyName System.Windows.Forms, System.Drawing

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Fg {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out Rect r);
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
}
"@

$p = Get-Process -Name loom | Select-Object -First 1
[void][Fg]::SetForegroundWindow($p.MainWindowHandle)
Start-Sleep -Milliseconds 600

# Ctrl+K, type a title, Enter -> the palette opens that item's drawer
[System.Windows.Forms.SendKeys]::SendWait("^k")
Start-Sleep -Milliseconds 700
[System.Windows.Forms.SendKeys]::SendWait("Blonde")
Start-Sleep -Milliseconds 900
[System.Windows.Forms.SendKeys]::SendWait("{ENTER}")
Start-Sleep -Seconds 3

$r = New-Object Fg+Rect
[void][Fg]::GetWindowRect($p.MainWindowHandle, [ref]$r)
$w = $r.Right - $r.Left
$h = $r.Bottom - $r.Top

$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($r.Left, $r.Top, 0, 0, (New-Object System.Drawing.Size $w, $h))
$bmp.Save('D:\something cook\loom\capture-drawer.png')
$g.Dispose(); $bmp.Dispose()

"window ${w}x$h at $($r.Left),$($r.Top) -> drawer screenshot saved"
