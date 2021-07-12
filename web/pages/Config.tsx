import React from 'react'
import { configs } from '../Plugin'
import { Box, Toolbar, Container, Grid, Card, CardHeader, Divider, CardContent } from '@material-ui/core'

configs.push({
  title: '连接设置',
  component: () => <>
  </>
})

const Config: React.FC = () => {
  return <Box sx={{ minHeight: '100%', py: 3 }}>
    <Toolbar />
    <Container maxWidth={false}>
      <Grid container spacing={3}>
        {configs.map((it, i) => <Grid key={i} item lg={4} md={12} xl={6} xs={12}>
          <Card>
            <CardHeader title={it.title} />
            <Divider />
            <CardContent><it.component /></CardContent>
          </Card>
        </Grid>)}
      </Grid>
    </Container>
  </Box>
}

export default Config
