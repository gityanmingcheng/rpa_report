import { HttpClient } from './httpClient'

export class ApiService {
  private clients: Map<number, HttpClient> = new Map()

  private getClient(port: number): HttpClient {
    if (!this.clients.has(port)) {
      this.clients.set(port, new HttpClient(port))
    }
    return this.clients.get(port)!
  }

  async sendRequest<T>(params: {
    port: number
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    path: string
    data?: unknown
  }): Promise<T> {
    const { port, method, path, data } = params
    const client = this.getClient(port)
    return client.request<T>({ method, path, data })
  }
}

// 创建单例
export const apiService = new ApiService()
