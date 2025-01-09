import { net } from 'electron'

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  data?: unknown
  params?: Record<string, string>
}

export class HttpClient {
  private baseUrl: string

  constructor(port: number) {
    // port = 60451
    this.baseUrl = `http://localhost:${port}`
  }

  private buildUrl(path: string, params?: Record<string, string>): string {
    const url = new URL(this.baseUrl + path)
    console.log('url==', url)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value)
      })
    }
    return url.toString()
  }

  async request<T>({ method = 'GET', path, data, params }: RequestOptions): Promise<T> {
    return new Promise((resolve, reject) => {
      const request = net.request({
        method,
        url: this.buildUrl(path, params)
      })

      let responseData = ''

      request.on('response', (response) => {
        console.log('Response status:', response.statusCode)

        response.on('data', (chunk) => {
          responseData += chunk.toString()
          console.log('Received chunk:', chunk.toString())
        })

        response.on('end', () => {
          // console.log('完整响应数据:', responseData)

          try {
            if (!responseData.trim()) {
              console.log('响应数据为空')
              resolve([] as T)
              return
            }

            const result = JSON.parse(responseData)
            console.log('解析后的数据:', result)
            resolve(result)
          } catch (e) {
            console.error('解析响应数据失败:', e)
            console.error('原始响应数据:', responseData)
            reject(new Error(`解析响应数据失败: ${(e as Error).message}`))
          }
        })
      })

      request.on('error', (error) => {
        console.error('请求错误:', error)
        reject(new Error(`请求失败: ${error.message}`))
      })

      request.setHeader('Accept', 'application/json')

      if (data && method !== 'GET') {
        request.setHeader('Content-Type', 'application/json')
        request.write(JSON.stringify(data))
      }

      request.end()
    })
  }

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    return this.request({ method: 'GET', path, params })
  }

  async post<T>(path: string, data: Record<string, unknown>): Promise<T> {
    return this.request({ method: 'POST', path, data })
  }

  async put<T>(path: string, data: Record<string, unknown>): Promise<T> {
    return this.request({ method: 'PUT', path, data })
  }

  async delete<T>(path: string): Promise<T> {
    return this.request({ method: 'DELETE', path })
  }
}
