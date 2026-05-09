import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { ToastProvider, useToast } from '@/components/ui/toast'

function TriggerButton() {
  const { toast } = useToast()

  return (
    <button
      type="button"
      onClick={() => {
        toast({
          title: '保存成功',
          description: '客户端兼容分支已生效',
        })
      }}
    >
      触发提示
    </button>
  )
}

describe('ToastProvider', () => {
  const originalCrypto = globalThis.crypto

  afterEach(() => {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: originalCrypto,
    })
  })

  it('在缺少 randomUUID 时仍然可以创建 toast', () => {
    Object.defineProperty(globalThis, 'crypto', {
      configurable: true,
      value: {
        getRandomValues(array: Uint8Array) {
          for (let index = 0; index < array.length; index += 1) {
            array[index] = index + 1
          }
          return array
        },
      } satisfies Pick<Crypto, 'getRandomValues'>,
    })

    render(
      <ToastProvider>
        <TriggerButton />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '触发提示' }))

    expect(screen.getByText('保存成功')).toBeTruthy()
    expect(screen.getByText('客户端兼容分支已生效')).toBeTruthy()
  })
})
