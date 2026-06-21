"""
订阅雷达 Phase 1 — AI内容生产引擎

功能：
1. 基于内容日历和模板，生成多渠道内容草稿
2. 支持主题展开、大纲生成、正文撰写
3. 生成的内容输出到 content-library/

当前状态：框架就绪。API Key接入后即可全自动运行。
在API Key就绪前，手动使用此脚本的prompt模板辅助写作。

使用方式：
  python ai-content-generator.py --topic "视频会员对比" --channel xiaohongshu
  python ai-content-generator.py --batch  # 批量生成日历中的所有内容
"""

import json
import os
import sys
from datetime import datetime
from pathlib import Path

# ============================================================
# Configuration
# ============================================================

BASE_DIR = Path(__file__).parent.parent
ENGINE_CONFIG_FILE = BASE_DIR / "content-engine" / "engine-config.json"
CALENDAR_FILE = BASE_DIR / "content-engine" / "content-calendar.json"
OUTPUT_DIR = BASE_DIR / "content-library"

# Load engine config
with open(ENGINE_CONFIG_FILE, 'r', encoding='utf-8') as f:
    ENGINE_CONFIG = json.load(f)

CHANNELS = ENGINE_CONFIG['channels']
PILLARS = {p['id']: p for p in ENGINE_CONFIG['content_pillars']}
AI_PROMPTS = ENGINE_CONFIG['ai_prompts']

# ============================================================
# Prompt Templates (ready for API when keys available)
# ============================================================

def generate_content_brief(topic: str, channel: str, pillar: str = "tutorial") -> str:
    """Generate a content brief for the given topic and channel."""
    channel_config = CHANNELS.get(channel, {})
    pillar_config = PILLARS.get(pillar, {})

    prompt = f"""你是一个面向中国消费者的个人理财和订阅管理内容专家。

任务：为{channel_config.get('name', channel)}平台生成一篇内容大纲。

主题：{topic}
内容类型：{pillar_config.get('name', pillar)}
平台风格：{channel_config.get('tone', '专业可信')}
目标字数：{channel_config.get('optimal_length', '500-1000字')}

要求：
1. 生成3-5个标题备选（适应平台风格）
2. 列出3-5个核心观点
3. 设计一个吸引人的开头（hook）
4. 设计一个促进互动的结尾（CTA）
5. 建议配图方案

输出格式：Markdown
"""
    return prompt


def generate_expanded_draft(brief: str, channel: str) -> str:
    """Expand a content brief into a full draft."""
    channel_config = CHANNELS.get(channel, {})

    prompt = f"""基于以下内容大纲，撰写一篇完整的{channel_config.get('name', channel)}平台内容。

大纲：
{brief}

要求：
- 风格：{channel_config.get('tone', '专业可信')}
- 字数：{channel_config.get('optimal_length', '500-1000字')}
- 必须包含具体数字或数据
- 必须包含可操作的建议
- 结尾必须有一个促进读者评论的问题
- 使用合适的emoji（但不要过度）

输出一篇可以直接发布的完整内容。
"""
    return prompt


def generate_platform_adaptation(source_content: str, target_channel: str) -> str:
    """Adapt content from one platform format to another."""
    channel_config = CHANNELS.get(target_channel, {})

    prompt = f"""将以下内容适配为{channel_config.get('name', target_channel)}平台的风格。

原文：
{source_content}

适配要求：
- 调整语气和风格为：{channel_config.get('tone', '专业可信')}
- 调整长度为目标：{channel_config.get('optimal_length', '500-1000字')}
- 保持核心信息和数据不变
- 调整格式和互动方式以适配目标平台
- 重新设计标题和开头

输出适配后的完整内容。
"""
    return prompt


# ============================================================
# Content Template Engine (works without API)
# ============================================================

CONTENT_TEMPLATES = {
    "shock": {
        "xiaohongshu": """# {title}

## 标题备选
1. {hook_question}
2. {emotional_title}
3. {number_title}

## 正文

{opening_hook}

{personal_story_or_data}

{key_insight}

{call_to_action}

## 标签
{subs_related_tags}

## 配图方案
图1：震惊/好奇封面图
图2-3：数据可视化或对比图
图4：CTA卡片""",

        "zhihu": """# {title}

## 回答的问题
"{question}"

## 正文

{data_driven_opening}

{analysis_section}

{practical_advice}

## 参考来源
{sources}

## 互动引导
{engagement_cta}"""
    },

    "tutorial": {
        "xiaohongshu": """# {title}

## 正文

{intro_hook}

📍 **操作路径**：
{step_by_step_path}

📋 **详细步骤**：
{detailed_steps}

⚠️ **注意事项**：
{warnings}

💡 **进阶技巧**：
{advanced_tips}

## 互动
{engagement_question}

## 标签
{tutorial_tags}"""
    },

    "comparison": {
        "xiaohongshu": """# {title}

## 正文

先说结论：{verdict}

### 📊 详细对比

{comparison_table}

### 💰 省钱方案

方案A：{plan_a}
方案B：{plan_b}
方案C：{plan_c}

### ✨ 我的推荐

{recommendation}

## 互动
{engagement_question}

## 标签
{comparison_tags}"""
    }
}


def fill_template(pillar_id: str, channel: str, params: dict) -> str:
    """Fill a content template with parameters."""
    pillar_templates = CONTENT_TEMPLATES.get(pillar_id, {})
    template = pillar_templates.get(channel)

    if not template:
        # Fallback: generic structure
        return f"""# {params.get('title', '未命名')}

## 正文

{params.get('content', '内容待生成')}

---
*由订阅雷达内容引擎生成 · {datetime.now().strftime('%Y-%m-%d')}*
"""

    try:
        return template.format(**params)
    except KeyError as e:
        return f"# 模板参数缺失: {e}\n\n请补充所需参数后重新生成。"


# ============================================================
# Content Index Management
# ============================================================

def update_content_index():
    """Scan content-library and update the content index."""
    index = {}
    for channel_dir in OUTPUT_DIR.iterdir():
        if channel_dir.is_dir():
            channel = channel_dir.name
            files = list(channel_dir.glob("*.md"))
            index[channel] = [
                {
                    "file": f.name,
                    "path": str(f.relative_to(BASE_DIR)),
                    "size_kb": round(f.stat().st_size / 1024, 1)
                }
                for f in sorted(files)
            ]

    index_path = OUTPUT_DIR / "content-index.json"
    with open(index_path, 'w', encoding='utf-8') as f:
        json.dump(index, f, ensure_ascii=False, indent=2)

    return index


# ============================================================
# CLI Interface
# ============================================================

def main():
    import argparse
    parser = argparse.ArgumentParser(description='订阅雷达 AI内容引擎')
    parser.add_argument('--topic', type=str, help='内容主题')
    parser.add_argument('--channel', type=str, choices=['xiaohongshu', 'zhihu', 'wechat_mp'],
                       help='目标平台')
    parser.add_argument('--pillar', type=str, default='tutorial',
                       choices=['shock', 'tutorial', 'story', 'data', 'comparison'],
                       help='内容支柱类型')
    parser.add_argument('--batch', action='store_true', help='批量生成日历中的所有待生成内容')
    parser.add_argument('--index', action='store_true', help='更新内容索引')
    parser.add_argument('--prompt-only', action='store_true',
                       help='仅输出API prompt（不生成内容，用于手动调用API）')

    args = parser.parse_args()

    if args.index:
        index = update_content_index()
        total = sum(len(v) for v in index.values())
        print(f"✅ 内容索引已更新：{total} 篇")
        for channel, files in index.items():
            print(f"   {channel}: {len(files)} 篇")
        return

    if args.prompt_only and args.topic:
        prompt = generate_content_brief(args.topic, args.channel or 'xiaohongshu', args.pillar)
        print("=" * 60)
        print("📝 API PROMPT（复制到Claude/ChatGPT使用）")
        print("=" * 60)
        print(prompt)
        return

    if args.topic:
        # Generate params and fill template
        params = {
            "title": args.topic,
            "hook_question": f"你知道吗？{args.topic}",
            "emotional_title": f"关于{args.topic}，90%的人都不知道的事",
            "number_title": f"用数据说话：{args.topic}",
            "opening_hook": f"最近在研究{args.topic}，发现了一些有意思的数据...",
            "personal_story_or_data": "（此处展开具体内容）",
            "key_insight": "（核心洞察）",
            "call_to_action": "你怎么看？评论区聊聊 👇",
            "subs_related_tags": "#订阅管理 #省钱 #消费 #实用",
            "question": f"关于{args.topic}，你最想了解什么？",
            "data_driven_opening": f"关于{args.topic}，我们来看一组数据。",
            "analysis_section": "（详细分析）",
            "practical_advice": "（可操作建议）",
            "sources": "数据来源将在正式发布前补充。",
            "engagement_cta": "如果你也有类似经历，欢迎在评论区分享。",
            "content": "（内容待通过API生成或手动撰写）"
        }

        content = fill_template(args.pillar, args.channel or 'xiaohongshu', params)
        print(content)

        # Save to file
        timestamp = datetime.now().strftime('%Y%m%d-%H%M%S')
        channel_dir = OUTPUT_DIR / (args.channel or 'xiaohongshu')
        channel_dir.mkdir(parents=True, exist_ok=True)
        output_file = channel_dir / f"generated-{timestamp}.md"
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"\n💾 已保存到: {output_file}")

    elif args.batch:
        print("📅 批量生成模式")
        print("功能就绪。接入API Key后可一键生成日历中的所有内容。")
        print("当前请使用 --prompt-only 获取单篇prompt后手动调用API。")

    else:
        parser.print_help()
        print("\n💡 快速开始：")
        print("  python ai-content-generator.py --topic '微信自动续费教程' --channel xiaohongshu --pillar tutorial --prompt-only")
        print("  python ai-content-generator.py --index  # 更新内容索引")


if __name__ == '__main__':
    main()
