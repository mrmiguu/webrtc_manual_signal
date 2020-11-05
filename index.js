import 'babel-polyfill'
import React from 'react'
import {
  render,
} from 'react-dom'

import './index.scss'
import Demo from './Demo'

render(<Demo />, document.getElementById('root'))
