const cyan = '\x1B[36m';
const blue = '\x1B[34m';
const green = '\x1B[32m';
const yellow = '\x1B[33m';
const reset = '\x1B[0m';

void printBanner(String version) {
  print('''
$cyan
      █████╗ ██████╗ ██╗    ██████╗  █████╗ ███████╗██╗  ██╗
     ██╔══██╗██╔══██╗██║    ██╔══██╗██╔══██╗██╔════╝██║  ██║
     ███████║██████╔╝██║    ██║  ██║███████║███████╗███████║
     ██╔══██║██╔═══╝ ██║    ██║  ██║██╔══██║╚════██║██╔══██║
     ██║  ██║██║     ██║    ██████╔╝██║  ██║███████║██║  ██║
     ╚═╝  ╚═╝╚═╝     ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
$reset
$blue══════════════════════════════════════════════$reset
    $blue🚀 API Dash CLI$reset    $green$version$reset
$blue══════════════════════════════════════════════$reset

Terminal-first API testing and automation
 Type $blue'apidash help '$reset to see all commands.$reset
''');
}
