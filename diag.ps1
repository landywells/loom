Add-Type -AssemblyName System.Drawing

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Diag {
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out Rect r);
  [DllImport("user32.dll")] public static extern bool PrintWindow(IntPtr h, IntPtr hdc, uint flags);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
}
"@

Get-Process -Name loom -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2
"loom processes before launch: $((Get-Process -Name loom -ErrorAction SilentlyContinue | Measure-Object).Count)"

$err = 'D:\something cook\loom\run-stderr.txt'
Remove-Item $err -ErrorAction SilentlyContinue
$p = Start-Process -FilePath 'D:\vibecoded\loom\loom.exe' -PassThru -RedirectStandardError $err
Start-Sleep -Seconds 9

"processes after launch: $((Get-Process -Name loom -ErrorAction SilentlyContinue | Measure-Object).Count)"
"webview processes: $((Get-Process -Name msedgewebview2 -ErrorAction SilentlyContinue | Measure-Object).Count)"
$p2 = Get-Process -Name loom -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $p2) { 'NO PROCESS — it exited'; if (Test-Path $err) { Get-Content $err }; exit 1 }

"main window handle: $($p2.MainWindowHandle)  visible: $([Diag]::IsWindowVisible($p2.MainWindowHandle))  title: '$($p2.MainWindowTitle)'"
$r = New-Object Diag+Rect
[void][Diag]::GetWindowRect($p2.MainWindowHandle, [ref]$r)
$w = $r.Right - $r.Left
$h = $r.Bottom - $r.Top
"rect: $($r.Left),$($r.Top) -> $($r.Right),$($r.Bottom) = ${w}x${h}"

$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$hdc = $g.GetHdc()
$ok = [Diag]::PrintWindow($p2.MainWindowHandle, $hdc, 2)
$g.ReleaseHdc($hdc)
$bmp.Save('D:\something cook\loom\capture-blank.png')

# how much of the capture is a single colour? a blank webview is nearly uniform
$colors = @{}
for ($y = 0; $y -lt $h; $y += 7) {
  for ($x = 0; $x -lt $w; $x += 7) {
    $c = $bmp.GetPixel($x, $y)
    $key = "$($c.R / 16),$($c.G / 16),$($c.B / 16)"
    $colors[$key] = 1 + $colors[$key]
  }
}
$g.Dispose(); $bmp.Dispose()
$sampled = ($colors.Values | Measure-Object -Sum).Sum
$top = $colors.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 3
"PrintWindow=$ok  distinct colour buckets: $($colors.Count) of $sampled samples"
foreach ($t in $top) { "  bucket $($t.Key): $([math]::Round(100 * $t.Value / $sampled))%" }

"--- stderr ---"
if (Test-Path $err) { Get-Content $err | Select-Object -First 20 } else { '(none)' }
