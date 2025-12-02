#!/usr/bin/env bash
set -euo pipefail
ORIG="/Users/farzad/fbc-lab-9"
CLEAN="/Users/farzad/fbc_lab_v10"
REPORT="/Users/farzad/fbc_lab_v10/gap_analysis_report.md"

echo "# Codebase Gap Analysis Report" > "$REPORT"
echo "Generated on $(date)" >> "$REPORT"

echo "Running diff..."
# Capture diff output, excluding noise
diff -qr --exclude=".git" --exclude="node_modules" --exclude=".next" --exclude="dist" --exclude=".DS_Store" --exclude=".env*" "$ORIG" "$CLEAN" > /tmp/diff_output.txt || true

echo "\n## 1. File System Differences" >> "$REPORT"

echo "### Missing in Clean Version (Potential Gaps)" >> "$REPORT"
grep "Only in $ORIG" /tmp/diff_output.txt | sed "s|Only in $ORIG|Path: |" >> "$REPORT" || echo "None" >> "$REPORT"

echo "\n### Extra in Clean Version" >> "$REPORT"
grep "Only in $CLEAN" /tmp/diff_output.txt | sed "s|Only in $CLEAN|Path: |" >> "$REPORT" || echo "None" >> "$REPORT"

echo "\n### Modified Files" >> "$REPORT"
grep "differ" /tmp/diff_output.txt | awk '{print "- " $2 " vs " $4}' >> "$REPORT" || echo "None" >> "$REPORT"

echo "\n## 2. Dependency Analysis" >> "$REPORT"
if [ -f "$ORIG/package.json" ] && [ -f "$CLEAN/package.json" ]; then
    echo "Comparing package.json dependencies..." >> "$REPORT"
    jq -r '.dependencies // {} | keys[]' "$ORIG/package.json" | sort > /tmp/deps_orig.txt
    jq -r '.dependencies // {} | keys[]' "$CLEAN/package.json" | sort > /tmp/deps_clean.txt
    
    echo "### Missing Dependencies (in Clean)" >> "$REPORT"
    comm -23 /tmp/deps_orig.txt /tmp/deps_clean.txt | sed 's/^/- /' >> "$REPORT"
    
    echo "\n### New Dependencies (in Clean)" >> "$REPORT"
    comm -13 /tmp/deps_orig.txt /tmp/deps_clean.txt | sed 's/^/- /' >> "$REPORT"
    
    echo "\n### DevDependencies Analysis" >> "$REPORT"
    jq -r '.devDependencies // {} | keys[]' "$ORIG/package.json" | sort > /tmp/devdeps_orig.txt
    jq -r '.devDependencies // {} | keys[]' "$CLEAN/package.json" | sort > /tmp/devdeps_clean.txt
    
    echo "#### Missing DevDependencies" >> "$REPORT"
    comm -23 /tmp/devdeps_orig.txt /tmp/devdeps_clean.txt | sed 's/^/- /' >> "$REPORT"
else
    echo "package.json missing in one or both directories." >> "$REPORT"
fi

echo "\n## 3. Configuration Drift" >> "$REPORT"
for config in "tsconfig.json" ".eslintrc.json" "next.config.js" "tailwind.config.ts" "vite.config.ts"; do
    if [ -f "$ORIG/$config" ] && [ -f "$CLEAN/$config" ]; then
        if ! cmp -s "$ORIG/$config" "$CLEAN/$config"; then
            echo "### $config has changed" >> "$REPORT"
            echo "\`\`\`diff" >> "$REPORT"
            diff -u "$ORIG/$config" "$CLEAN/$config" | head -n 20 >> "$REPORT" || true
            echo "\`\`\`" >> "$REPORT"
        fi
    elif [ -f "$ORIG/$config" ]; then
        echo "### $config is MISSING in clean version" >> "$REPORT"
    fi
done

echo "\nReport generated at $REPORT"
