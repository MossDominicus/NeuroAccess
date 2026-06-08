#!/usr/bin/env python3
"""
检查 translations.ts 文件中所有翻译键是否在所有语言中定义了
"""
import re
import sys

def parse_translations(file_path):
    """解析 translations.ts 文件，返回每个语言的翻译键集合"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 找到所有语言块
    # 语言块格式: zh: { ... }, en: { ... }, etc.
    lang_pattern = r'(\w+):\s*\{'
    lang_matches = list(re.finditer(lang_pattern, content))
    
    languages = {}
    for i, match in enumerate(lang_matches):
        lang_name = match.group(1)
        start_pos = match.end()
        
        # 找到对应的结束位置（下一个语言块的开始或文件结束）
        if i + 1 < len(lang_matches):
            end_pos = lang_matches[i + 1].start()
        else:
            end_pos = len(content)
        
        # 提取该语言块的内容
        lang_content = content[start_pos:end_pos]
        
        # 提取所有翻译键（格式: key: "value",）
        key_pattern = r'^\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*:\s*["\']'
        keys = set()
        for line in lang_content.split('\n'):
            key_match = re.match(key_pattern, line)
            if key_match:
                keys.add(key_match.group(1))
        
        languages[lang_name] = keys
    
    return languages

def main():
    file_path = '/Users/strayintel/Desktop/EEG项目/NeuroAccess/src/lib/translations.ts'
    
    print("正在解析 translations.ts 文件...")
    languages = parse_translations(file_path)
    
    if not languages:
        print("错误：无法解析文件或文件中没有找到语言定义")
        return
    
    print(f"\n找到 {len(languages)} 种语言: {', '.join(languages.keys())}")
    
    # 检查每种语言的翻译键数量
    print("\n--- 每种语言的翻译键数量 ---")
    for lang, keys in languages.items():
        print(f"{lang}: {len(keys)} 个翻译键")
    
    # 找到所有语言中都存在的翻译键（完整集）
    all_keys = set()
    for keys in languages.values():
        all_keys.update(keys)
    
    print(f"\n总共有 {len(all_keys)} 个不同的翻译键")
    
    # 检查每种语言缺失的翻译键
    print("\n--- 每种语言缺失的翻译键 ---")
    missing_found = False
    for lang, keys in languages.items():
        missing = all_keys - keys
        if missing:
            missing_found = True
            print(f"\n{lang} 缺失 {len(missing)} 个翻译键:")
            for key in sorted(missing):
                print(f"  - {key}")
    
    if not missing_found:
        print("✓ 所有语言都包含了所有翻译键！")
    else:
        print("\n⚠️  发现缺失的翻译键，需要修复")
    
    # 检查是否有翻译键只在某些语言中存在（可能是多余的）
    print("\n--- 只在某些语言中存在的翻译键（可能是多余的）---")
    extra_found = False
    for lang, keys in languages.items():
        extra = keys - all_keys
        if extra:
            extra_found = True
            print(f"\n{lang} 有 {len(extra)} 个额外的翻译键（不在全集中）:")
            for key in sorted(extra):
                print(f"  - {key}")
    
    if not extra_found:
        print("✓ 没有发现额外的翻译键")
    
    # 总结
    print("\n" + "="*60)
    if not missing_found and not extra_found:
        print("✓ 翻译文件检查通过！所有语言都完整。")
    else:
        print("⚠️  翻译文件存在问题，请查看上面的详细信息。")

if __name__ == '__main__':
    main()
