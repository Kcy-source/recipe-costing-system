# Recipe Costing System

品珍宫 / Yummy Palace 云端食谱与 Food Cost 管理系统。

## 已完成

- Supabase 邮箱注册 / 登录
- 原材料管理
- 采购规格、采购价、净料率
- 自动计算实际单位成本
- 食谱管理
- 食谱配料与损耗率
- 自动计算总配料成本、每份成本、Food Cost %、毛利和毛利率
- 原材料价格修改后，所有相关食谱自动按最新价格重新计算
- 菜品分类
- 手机 / 平板 / 电脑响应式界面
- Supabase RLS：未登录无法读取或修改成本资料

## Costing 逻辑

原材料实际单位成本 = 采购价 ÷ (基础数量 × 净料率)

单项配料成本 = 使用量 × 实际单位成本 ÷ (1 - 损耗率)

每份成本 = 食谱总配料成本 ÷ 出品数量

Food Cost % = 每份成本 ÷ 售价 × 100

毛利 = 售价 - 每份成本

## Supabase

Project: `recipe-costing-system`

Region: Singapore (`ap-southeast-1`)

前端只使用 Supabase Publishable Key。数据库表已启用 Row Level Security。

## 主要文件

- `index.html` - 页面结构
- `styles.css` - 界面样式
- `app.js` - 登录、资料管理及 Costing 计算

## 下一步建议

1. 增加采购价格历史页面
2. 增加食谱照片
3. 增加权限等级（Admin / User / Viewer）
4. 增加 Excel 导入 / 导出
5. 增加打印版食谱 Costing Sheet
6. 部署到固定网址供员工使用
