# -*- coding: utf-8 -*-
"""
一键把 Obsidian 学习笔记同步到博客仓库的 notes/ 文件夹，并生成索引。
用法：
    python tools/sync_notes.py            # 只同步到本地仓库
    python tools/sync_notes.py --push     # 同步并自动 commit + push 上线
"""

import json
import os
import shutil
import subprocess
import sys

# ====== 需要时改这两个路径 ======
VAULT_NOTES = r'D:\Obsidain_Note\Obsidian Note\学习笔记'
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NOTES_DIR = os.path.join(REPO_ROOT, 'notes')

SKIP_NAMES = {'.obsidian', '.trash', '.git', 'index.json'}
ALLOWED_EXT = ('.md', '.markdown', '.txt', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg')


def collect_files(dirpath, prefix):
    """递归收集需要同步的文件（相对路径，正斜杠）。"""
    files = []
    for entry in sorted(os.scandir(dirpath), key=lambda e: (e.is_file(), e.name.lower())):
        if entry.name in SKIP_NAMES or entry.name.startswith('.'):
            continue
        rel = (prefix + '/' + entry.name) if prefix else entry.name
        if entry.is_dir():
            files.extend(collect_files(entry.path, rel))
        elif rel.lower().endswith(ALLOWED_EXT):
            files.append(rel.replace('\\', '/'))
    return files


def main():
    if not os.path.isdir(VAULT_NOTES):
        print('找不到 Obsidian 学习笔记文件夹：', VAULT_NOTES)
        sys.exit(1)

    # 1. 清空旧目录，完整复制（保证和 Obsidian 完全一致）
    if os.path.isdir(NOTES_DIR):
        shutil.rmtree(NOTES_DIR)
    shutil.copytree(
        VAULT_NOTES, NOTES_DIR,
        ignore=shutil.ignore_patterns('.obsidian', '.trash', '.*', 'index.json')
    )

    # 2. 生成文件索引（网页靠它知道有哪些笔记，GitHub Pages 不能列出目录）
    files = collect_files(NOTES_DIR, '')
    with open(os.path.join(NOTES_DIR, 'index.json'), 'w', encoding='utf-8') as f:
        json.dump({'files': files}, f, ensure_ascii=False, indent=2)

    print(f'已同步 {len(files)} 个文件到 notes/')

    # 3. 可选：自动提交并推送
    if '--push' in sys.argv:
        git = ['git', '-C', REPO_ROOT]
        subprocess.run(git + ['add', 'notes'], check=True)
        has_changes = subprocess.run(
            git + ['diff', '--cached', '--quiet'],
            capture_output=True, encoding='utf-8', errors='replace'
        )
        if has_changes.returncode != 0:
            # 有暂存的笔记改动，才需要提交
            subprocess.run(git + ['commit', '-m', '同步 Obsidian 学习笔记'], check=True)
        else:
            print('笔记没有新变化（内容已提交过），直接执行推送。')
        # 无论有没有新提交都推送一次，确保本地已提交的内容一定上线
        # 先合并远程（GitHub Actions 可能刚提交过），再推送，避免被拒绝
        # --autostash：即使有未提交改动也能自动暂存合并，完成后自动恢复
        subprocess.run(git + ['pull', '--rebase', '--autostash', 'origin', 'master'], check=True)
        subprocess.run(git + ['push', 'origin', 'master'], check=True)
        print('已推送到 GitHub，稍等片刻线上自动更新。')


if __name__ == '__main__':
    main()
