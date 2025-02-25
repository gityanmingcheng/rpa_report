# File API 接口文档

## 概述
该接口提供文件相关的操作,包括文件路径验证、Excel表格解析等功能。

## API 端点

### 1. 验证文件路径
验证指定路径的文件或目录是否存在。

- **接口**: `/api/file/filepath`
- **方法**: `POST`
- **请求体**:
```json
{
"path": "文件路径字符串"
}
```
- **响应**:
```json
{
"exists": "布尔值",
"path": "文件路径字符串",
"is_file": "布尔值",
"is_dir": "布尔值"
}
```


### 2. 解析Excel文件
解析Excel文件，并返回解析结果。

- **接口**: `/api/file/parse_excel`
- **方法**: `POST`
- **请求体**:
```json
{
"path": "Excel文件路径",
"header": 0 // 可选，表头行号，默认为0
}
```

- **响应**:
```json
{
"code": 200,
"data": ["列名1", "列名2", "列名3", ...],
"message": "成功",
"ok": true
}
```

### 3. 获取模板文件头信息
获取系统预设的Excel模板文件的表头信息。

- **接口**: `/api/file/getTemHeader`
- **方法**: `GET`
- **请求参数**: 无
- **成功响应**:
```json
{
"code": 200,
"data": ["列名1", "列名2", "列名3", ...],
"message": "成功",
"ok": true
}
```
### 错误响应
所有接口的错误响应格式：
```json
{
"code": 500,
"message": "错误信息",
"ok": false
}
```

## 注意事项
1. Excel文件支持.xls和.xlsx格式
2. 文件路径需要使用完整路径
3. 模板文件位于系统data目录下