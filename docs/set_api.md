# 配置管理 API 文档

本文档描述了配置管理相关的 API 接口。所有数据都存储在 `setdata` 表中。

## API 接口列表

### 1. 保存配置数据

- **接口地址**: `/api/saveset`
- **请求方式**: POST
- **请求参数**:
  ```json
  {
    "_key": "配置关键字",
    "option": ["option1","option2","选择项3"]
  }
  ```
- **响应结果**:
  ```json
  {
    "code": 200,
    "data": {
      "_id": "uuid字符串",
      "_key": "配置关键字",
      "option": ["option1","option2","选择项3"],
      "created_at": "创建时间",
      "updated_at": "更新时间"
    },
    "message": "success"
  }
  ```

### 2. 获取所有配置

- **接口地址**: `/api/set`
- **请求方式**: GET
- **请求参数**: 无
- **响应结果**:
  ```json
  {
    "code": 200,
    "data": [
      {
        "_id": "uuid字符串",
        "_key": "配置关键字",
        "option": ["option1","option2","选择项3"],
        "created_at": "创建时间",
        "updated_at": "更新时间"
      }
      // ... 更多配置数据
    ],
    "message": "success"
  }
  ```

### 3. 获取单个配置

- **接口地址**: `/api/set/<set_id>`
- **请求方式**: GET
- **路径参数**: 
  - set_id: 配置ID
- **响应结果**:
  ```json
  {
    "code": 200,
    "data": {
      "_id": "uuid字符串",
      "_key": "配置关键字",
      "option": ["option1","option2","选择项3"],
      "created_at": "创建时间",
      "updated_at": "更新时间"
    },
    "message": "success"
  }
  ```

### 4. 更新配置

- **接口地址**: `/api/set`
- **请求方式**: POST
- **请求参数**:
  ```json
  {
    "_id": "要更新的配置ID",
    "_key": "新的配置关键字",
    "option": ["新option1","新option2","新选择项3"]
  }
  ```
- **响应结果**:
  ```json
  {
    "code": 200,
    "data": {
      "_id": "uuid字符串",
      "_key": "新的配置关键字",
      "option": ["新option1","新option2","新选择项3"],
      "created_at": "创建时间",
      "updated_at": "更新时间"
    },
    "message": "success"
  }
  ```

### 5. 删除配置

- **接口地址**: `/api/set/delete/<set_id>`
- **请求方式**: GET
- **路径参数**: 
  - set_id: 要删除的配置ID
- **响应结果**:
  ```json
  {
    "code": 200,
    "data": null,
    "message": "success"
  }
  ```

## 错误响应

当发生错误时，API 将返回以下格式的响应：

常见错误码：
- 404: 未找到请求的资源
- 500: 服务器内部错误

## 数据字段说明

每条配置数据包含以下系统字段：
- `_id`: 唯一标识符（UUID格式）
- `_key`: 配置关键字
- `option`: 选项数组
- `created_at`: 创建时间（ISO格式）
- `updated_at`: 最后更新时间（ISO格式）

其他字段可根据实际业务需求自定义。
