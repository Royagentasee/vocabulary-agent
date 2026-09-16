import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'

import './app.css'

function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    console.log('Vocabulary Agent launched')
  })

  return children
}

export default App