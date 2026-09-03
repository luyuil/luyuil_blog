# -*- coding: utf-8 -*-
"""
把 GitHub Issues 里的“说说”导出成博客直接读取的静态文件 diary.json。
博客前端不再依赖 GitHub API，所有浏览器/网络都能稳定显示。
可在本地运行，也会被 GitHub Actions 在发 issue 后自动运行。
"""

import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone

REPO = 'luyuil/luyuil_blog'
OWNER = REPO.split('/')[0]   # 只认博主本人发的 issue
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'diary.json')


def fetch(url, token=None):
    req = urllib.request.Request(url, headers={'User-Agent': 'luyuil-blog-diary'})
    if token:
        req.add_header('Authorization', 'token ' + token)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def to_ms(iso):
    try:
        return int(datetime.strptime(iso, '%Y-%m-%dT%H:%M:%SZ').replace(tzinfo=timezone.utc).timestamp() * 1000)
    except Exception:
        return 0


def split_body_images(body):
    """把 issue 正文里的 Markdown 图片拆出来，raw 图片地址换成站内相对路径。"""
    images = []
    text = re.sub(r'!\[([^\]]*)\]\((https?://[^)\s]+)\)', lambda m: images.append(m.group(2)) or '', body or '')
    images = [
        re.sub(r'^https://raw\.githubusercontent\.com/' + REPO + r'/master/', './', u)
        for u in images
    ]
    return text.replace('\n{3,}', '\n\n').strip(), images


def main():
    token = os.environ.get('GH_TOKEN')
    url = 'https://api.github.com/repos/' + REPO + \
        '/issues?state=open&per_page=100&sort=created&direction=desc'
    issues = fetch(url, token)

    entries = []
    for i in issues:
        if i.get('pull_request'):
            continue  # 跳过 PR
        if (i.get('user') or {}).get('login') != OWNER:
            continue  # 防止陌生人在公开仓库开 issue 刷屏
        text, images = split_body_images(i.get('body') or '')
        # 直接用 GitHub 发 issue 时，文字可能写在标题里而不是正文，这里做兜底
        if not text and i.get('title'):
            text = i['title']
        entries.append({
            'id': 'gh-' + str(i['number']),
            'number': i['number'],
            'text': text,
            'images': images,
            'createdAt': to_ms(i.get('created_at', '')),
            'fromGitHub': True
        })

    entries.sort(key=lambda e: e['createdAt'], reverse=True)
    # 注意：不能放“更新时间”这类每次都会变的字段，否则 Actions 每次都会
    # 认为有变化而重复提交，形成死循环。只有 entries 真正变化时才该提交。
    data = {'entries': entries}
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print('diary.json 已更新:', len(entries), '条说说')


if __name__ == '__main__':
    main()
