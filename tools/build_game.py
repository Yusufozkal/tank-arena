"""Builds game/index.html from game/src/: shell.html with style.css and the NN-*.js modules (in name order; NNa-*.js sorts between NN-*.js and the next number) put at the two markers.

    python3 tools/build_game.py           write game/index.html
    python3 tools/build_game.py --check   exit 1 if game/index.html differs from the build (run before every commit)
"""
import re
import sys
from paths import GAME, GAME_SRC

CSS_MARK = '/*@@CSS@@*/\n'
JS_MARK = '/*@@JS@@*/\n'


def build():
    rd = lambda p: p.read_bytes().decode('utf-8')
    shell = rd(GAME_SRC / 'shell.html')
    css = rd(GAME_SRC / 'style.css')
    js = ''.join(rd(p) for p in sorted(GAME_SRC.glob('[0-9][0-9]*.js'), key=lambda q: q.name) if re.fullmatch(r'\d\d[a-z]?-.*\.js', p.name))
    assert shell.count(CSS_MARK) == 1 and shell.count(JS_MARK) == 1, 'shell.html needs one CSS and one JS marker line'
    return shell.replace(CSS_MARK, css).replace(JS_MARK, js)


if __name__ == '__main__':
    out = build().encode('utf-8')
    if '--check' in sys.argv:
        if GAME.read_bytes() != out:
            print('game/index.html differs from the build of game/src: run python3 tools/build_game.py')
            sys.exit(1)
        print('ok: game/index.html matches game/src')
    else:
        GAME.write_bytes(out)
        print(f'wrote {GAME} ({len(out)} bytes)')
